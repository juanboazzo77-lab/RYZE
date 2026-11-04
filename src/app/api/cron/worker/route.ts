import { NextResponse, type NextRequest } from 'next/server';
import { DateTime } from 'luxon';
import type { NotificationKind } from '@prisma/client';
import { prisma } from '@/server/db';
import { limitsFor } from '@/server/entitlements';
import { sendPushToUser } from '@/server/push';
import { computeNudges } from '@/server/nudges';

/**
 * Worker de notificaciones. Pensado para Vercel Cron (corre 1 vez por día —
 * límite del plan Hobby de Vercel):
 *  1. Recordatorio del check-in semanal (PRO) en el día elegido.
 *  2. Coach proactivo: avisos condicionales (entreno de hoy, registrar comidas,
 *     proteína, peso, racha) — máx. 2/día por usuario, respetando sus toggles.
 *  3. Entrega por Web Push de todo lo pendiente (`sent_at` NULL) y lo marca.
 * Todo es idempotente por día (dedup contra `notification`).
 *
 * Auth: header `Authorization: Bearer <CRON_SECRET>` (lo manda Vercel Cron) o
 * `?key=<CRON_SECRET>` para pruebas manuales.
 */

export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get('authorization') === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get('key') === secret;
}

const NUDGE_KINDS = ['WORKOUT_TODAY', 'LOG_MEALS', 'WEIGH_IN', 'PROTEIN_GOAL', 'STREAK'] as const;

async function maybeCheckinReminder(
  u: { id: string; timezone: string; weekStart: number },
  day: number,
): Promise<boolean> {
  const now = DateTime.now().setZone(u.timezone);
  if (now.weekday !== day) return false;

  const diff = (now.weekday - u.weekStart + 7) % 7;
  const weekStartDate = new Date(`${now.minus({ days: diff }).toISODate()}T00:00:00.000Z`);
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
  if (alreadyDone || alreadySent) return false;

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
  return true;
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
      entitlement: { select: { tier: true, createdAt: true } },
      notificationPreferences: { select: { kind: true, enabled: true, dayOfWeek: true } },
    },
  });

  let created = 0;
  let nudged = 0;

  for (const u of users) {
    const prefByKind = new Map(u.notificationPreferences.map((p) => [p.kind, p]));

    if (u.entitlement && limitsFor(u.entitlement).features.weekly_checkin) {
      const cp = prefByKind.get('WEEKLY_CHECKIN');
      if ((cp?.enabled ?? true) && (await maybeCheckinReminder(u, cp?.dayOfWeek ?? 1))) {
        created++;
      }
    }

    const enabledKinds = new Set<NotificationKind>(
      NUDGE_KINDS.filter((k) => prefByKind.get(k)?.enabled ?? true),
    );
    if (enabledKinds.size > 0) {
      const nudges = await computeNudges(u.id, u.timezone, u.weekStart, enabledKinds);
      for (const n of nudges) {
        await prisma.notification.create({
          data: {
            userId: u.id,
            kind: n.kind,
            title: n.title,
            body: n.body,
            url: n.url,
            scheduledFor: new Date(),
          },
        });
        nudged++;
      }
    }
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
    created,
    nudged,
    delivered: pending.length,
    pushed,
  });
}
