'use server';

import { DateTime } from 'luxon';
import type { NotificationKind } from '@prisma/client';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { can, limitsFor } from '@/server/entitlements';
import { addDaysISO, isoToUtcDate, localTodayISO, weekStartISO } from '@/lib/date';
import { getCheckinStatus } from '@/features/checkin/queries';
import { getNotificationPrefs } from './queries';

/** Lo que el teléfono necesita saber para programar los avisos locales de los próximos días. */
export interface ReminderPlan {
  enabled: Partial<Record<NotificationKind, boolean>>;
  /** Días de entrenamiento del plan activo, por día de la semana (1 lunes … 7 domingo). */
  trainingDays: Record<number, { name: string; exercises: number }>;
  trainedToday: boolean;
  /** Viene entrenando seguido (2+ sesiones en las últimas dos semanas): tiene racha que cuidar. */
  hasStreak: boolean;
  mealsToday: number;
  /** Gramos de proteína que faltan hoy (null si no tiene objetivo cargado). */
  proteinLeftG: number | null;
  /** Ya llegó (80% o más) al objetivo de proteína de hoy. */
  proteinOk: boolean;
  /** Fecha (yyyy-mm-dd) del próximo recordatorio de la revisión semanal, o null si no corresponde. */
  checkinISO: string | null;
}

export async function getReminderPlan(): Promise<ReminderPlan> {
  const ctx = await requireUser();
  const { userId, profile } = ctx;
  const db = forUser(userId);
  const todayISO = localTodayISO(profile.timezone);
  const today = isoToUtcDate(todayISO);

  // Secuencial a propósito: DATABASE_URL usa connection_limit=1.
  const prefs = await getNotificationPrefs(profile);
  const plan = await db.workoutPlan.findFirst({
    where: { isActive: true },
    select: { days: { select: { weekday: true, name: true, _count: { select: { exercises: true } } } } },
  });
  const activeOrDone = await db.workout.findFirst({
    where: { OR: [{ status: 'ACTIVE' }, { status: 'COMPLETED', finishedAt: { gte: today } }] },
    select: { id: true },
  });
  const recentDone = await db.workout.count({
    where: { status: 'COMPLETED', finishedAt: { gte: isoToUtcDate(addDaysISO(todayISO, -14)) } },
  });
  const meals = await db.foodEntry.aggregate({
    where: { date: today },
    _sum: { proteinG: true },
    _count: true,
  });
  const target = await db.nutritionTarget.findFirst({ where: { active: true }, select: { proteinG: true } });

  const trainingDays: ReminderPlan['trainingDays'] = {};
  for (const d of plan?.days ?? []) {
    if (d.weekday == null) continue;
    trainingDays[d.weekday] = { name: d.name, exercises: d._count.exercises };
  }

  const got = meals._sum.proteinG ?? 0;
  const proteinLeftG = target ? Math.max(0, Math.round(target.proteinG - got)) : null;

  let checkinISO: string | null = null;
  if (can(ctx.entitlement, 'weekly_checkin')) {
    const everyWeeks = Math.max(1, limitsFor(ctx.entitlement).checkinEveryWeeks);
    const st = await getCheckinStatus(profile, everyWeeks);
    if (st.enabled) {
      for (let k = 0; k < 7; k++) {
        const iso = addDaysISO(todayISO, k);
        if (DateTime.fromISO(iso, { zone: 'utc' }).weekday !== st.dayOfWeek) continue;
        const sameWeek = weekStartISO(iso, profile.weekStart) === st.weekStartISO;
        checkinISO = sameWeek && st.done ? null : iso;
        break;
      }
    }
  }

  return {
    enabled: Object.fromEntries(prefs.map((p) => [p.kind, p.enabled])),
    trainingDays,
    trainedToday: Boolean(activeOrDone),
    hasStreak: recentDone >= 2,
    mealsToday: meals._count,
    proteinLeftG,
    proteinOk: target ? got >= target.proteinG * 0.8 : false,
    checkinISO,
  };
}
