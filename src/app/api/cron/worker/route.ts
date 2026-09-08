import { NextResponse, type NextRequest } from 'next/server';
import { DateTime } from 'luxon';
import { prisma } from '@/server/db';
import { limitsFor } from '@/server/entitlements';
import { sendPushToUser } from '@/server/push';

/**
 * Worker de recordatorios. Pensado para Vercel Cron (corre cada hora):
 *  1. Crea la notificación del check-in semanal para quienes eligieron ese día y
 *     todavía no lo hicieron (idempotente por día).
 *  2. Entrega por Web Push todas las notificaciones pendientes (`sent_at` NULL)
 *     y las marca como enviadas.
 *
 * Auth: header `Authorization: Bearer <CRON_SECRET>` (lo manda Vercel Cron) o
 * `?key=<CRON_SECRET>` para pruebas manuales.
 */

export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization');
  if (header === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get('key') === secret;
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 503 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  }

  const users = await prisma.profile.findMany({
    where: { onboardingCompletedAt: { not: null } },
    select: {
      id: true,
      timezone: true,
      weekStart: true,
      entitlement: { select: { tier: true } },
      notificationPreferences: {
        where: { kind: 'WEEKLY_CHECKIN' },
        select: { enabled: true, dayOfWeek: true },
      },
    },
  });

  let created = 0;
  let considered = 0;

  for (const u of users) {
    if (!u.entitlement || !limitsFor(u.entitlement).features.weekly_checkin) continue;

    const pref = u.notificationPreferences[0];
    const enabled = pref?.enabled ?? true;
    const day = pref?.dayOfWeek ?? 1;
    if (!enabled) continue;

    const now = DateTime.now().setZone(u.timezone);
    if (now.weekday !== day) continue;
    considered++;

    // Inicio de la semana del usuario (weekStart 1=lunes … 7=domingo).
    const diff = (now.weekday - u.weekStart + 7) % 7;
    const weekStart = now.minus({ days: diff }).startOf('day');
    const weekStartDate = new Date(`${weekStart.toISODate()}T00:00:00.000Z`);
    const startOfLocalDay = new Date(`${now.toISODate()}T00:00:00.000Z`);

    const [alreadyDone, alreadySent] = await Promise.all([
      prisma.weeklyCheckin.findFirst({
        where: { userId: u.id, weekStart: weekStartDate },
        select: { id: true },
      }),
      prisma.notification.findFirst({
        where: { userId: u.id, kind: 'WEEKLY_CHECKIN', createdAt: { gte: startOfLocalDay } },
        select: { id: true },
      }),
    ]);
    if (alreadyDone || alreadySent) continue;

    await prisma.notification.create({
      data: {
        userId: u.id,
        kind: 'WEEKLY_CHECKIN',
        title: 'Revisión semanal',
        body: 'Contale al Coach cómo fue tu semana para ajustar lo que haga falta.',
        url: '/checkin',
        scheduledFor: new Date(),
      },
    });
    created++;
  }

  // --- Entrega por Web Push de todo lo pendiente ---
  const pending = await prisma.notification.findMany({
    where: { sentAt: null, scheduledFor: { lte: new Date() } },
    orderBy: { scheduledFor: 'asc' },
    take: 500,
  });

  let pushed = 0;
  for (const n of pending) {
    try {
      const { sent } = await sendPushToUser(n.userId, {
        title: n.title,
        body: n.body ?? undefined,
        url: n.url ?? '/dashboard',
        tag: n.kind.toLowerCase(),
      });
      pushed += sent;
    } catch (e) {
      console.error('[cron] push falló', n.id, (e as Error).message);
    }
    await prisma.notification.update({ where: { id: n.id }, data: { sentAt: new Date() } });
  }

  return NextResponse.json({
    ok: true,
    users: users.length,
    considered,
    created,
    delivered: pending.length,
    pushed,
  });
}
