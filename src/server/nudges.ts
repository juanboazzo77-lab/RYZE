import 'server-only';
import { DateTime } from 'luxon';
import type { NotificationKind } from '@prisma/client';
import { prisma } from './db';

/**
 * "Coach proactivo": condiciones que disparan un aviso, evaluadas por el cron en
 * la zona horaria del usuario. Respetan `notification_preference` y se limitan a
 * 2 por día por usuario (dedup por kind/día lo hace el cron).
 */

export interface Nudge {
  kind: NotificationKind;
  title: string;
  body: string;
  url: string;
}

const MAX_PER_DAY = 2;

export async function computeNudges(
  userId: string,
  timezone: string,
  weekStart: number,
  enabledKinds: Set<NotificationKind>,
): Promise<Nudge[]> {
  const now = DateTime.now().setZone(timezone);
  const hour = now.hour;
  const todayStart = new Date(`${now.toISODate()}T00:00:00.000Z`);
  const weekStartDate = new Date(
    `${now.minus({ days: (now.weekday - weekStart + 7) % 7 }).toISODate()}T00:00:00.000Z`,
  );

  // Ya avisados hoy (cualquier kind de nudge) + tope diario.
  const sentTodayRows = await prisma.notification.findMany({
    where: { userId, createdAt: { gte: todayStart } },
    select: { kind: true },
  });
  const sentKinds = new Set(sentTodayRows.map((r) => r.kind));
  let budget = MAX_PER_DAY - sentTodayRows.length;
  if (budget <= 0) return [];

  const out: Nudge[] = [];
  const wants = (k: NotificationKind) =>
    budget > 0 && enabledKinds.has(k) && !sentKinds.has(k);

  // --- WORKOUT_TODAY: mañana, hay día de plan para hoy y no entrenó ---
  if (wants('WORKOUT_TODAY') && hour >= 8 && hour <= 12) {
    const [plan, doneToday] = await Promise.all([
      prisma.workoutPlan.findFirst({
        where: { userId, isActive: true },
        select: { days: { where: { weekday: now.weekday }, select: { name: true, _count: { select: { exercises: true } } } } },
      }),
      prisma.workout.findFirst({
        where: {
          userId,
          OR: [{ status: 'ACTIVE' }, { status: 'COMPLETED', finishedAt: { gte: todayStart } }],
        },
        select: { id: true },
      }),
    ]);
    const day = plan?.days[0];
    if (day && !doneToday) {
      out.push({
        kind: 'WORKOUT_TODAY',
        title: 'Entrenamiento de hoy',
        body: `Hoy toca ${day.name} (${day._count.exercises} ejercicios).`,
        url: '/training',
      });
      budget--;
    }
  }

  // --- WEIGH_IN: mañana, sin pesarse hace 3+ días ---
  if (wants('WEIGH_IN') && hour >= 8 && hour <= 11) {
    const threeDaysAgo = new Date(`${now.minus({ days: 3 }).toISODate()}T00:00:00.000Z`);
    const recent = await prisma.weightEntry.findFirst({
      where: { userId, date: { gte: threeDaysAgo } },
      select: { id: true },
    });
    if (!recent) {
      out.push({
        kind: 'WEIGH_IN',
        title: 'Registrá tu peso',
        body: 'Hace unos días que no te pesás. Un registro rápido y listo.',
        url: '/progress',
      });
      budget--;
    }
  }

  // --- PROTEIN_GOAL: tarde/noche, viene registrando pero le falta proteína ---
  if (wants('PROTEIN_GOAL') && hour >= 18 && hour <= 22) {
    const [target, today] = await Promise.all([
      prisma.nutritionTarget.findFirst({ where: { userId, active: true }, select: { proteinG: true } }),
      prisma.foodEntry.aggregate({
        where: { userId, date: todayStart },
        _sum: { proteinG: true },
        _count: true,
      }),
    ]);
    const got = today._sum.proteinG ?? 0;
    if (target && today._count > 0 && got < target.proteinG * 0.8) {
      out.push({
        kind: 'PROTEIN_GOAL',
        title: 'Objetivo de proteína',
        body: `Te faltan ~${Math.round(target.proteinG - got)} g de proteína para llegar hoy.`,
        url: '/nutrition',
      });
      budget--;
    }
  }

  // --- LOG_MEALS: noche, casi sin registrar comidas ---
  if (wants('LOG_MEALS') && hour >= 20 && hour <= 23) {
    const count = await prisma.foodEntry.count({ where: { userId, date: todayStart } });
    if (count < 2) {
      out.push({
        kind: 'LOG_MEALS',
        title: 'Registrá tus comidas',
        body: 'Todavía no cargaste lo que comiste hoy.',
        url: '/nutrition',
      });
      budget--;
    }
  }

  // --- STREAK: tarde, racha en riesgo (día de plan y sin entrenar) ---
  if (wants('STREAK') && hour >= 17 && hour <= 21) {
    const [completed, planDayToday, doneToday] = await Promise.all([
      prisma.workout.findMany({
        where: { userId, status: 'COMPLETED', finishedAt: { gte: weekStartDate } },
        select: { finishedAt: true },
      }),
      prisma.workoutPlan.findFirst({
        where: { userId, isActive: true },
        select: { days: { where: { weekday: now.weekday }, select: { id: true } } },
      }),
      prisma.workout.findFirst({
        where: { userId, status: 'COMPLETED', finishedAt: { gte: todayStart } },
        select: { id: true },
      }),
    ]);
    if (completed.length >= 2 && planDayToday?.days.length && !doneToday) {
      out.push({
        kind: 'STREAK',
        title: 'No pierdas el ritmo',
        body: 'Hoy tenías entrenamiento planificado. Estás a tiempo.',
        url: '/training',
      });
      budget--;
    }
  }

  return out;
}
