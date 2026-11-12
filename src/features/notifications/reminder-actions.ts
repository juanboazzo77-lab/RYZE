'use server';

import { DateTime } from 'luxon';
import type { NotificationKind as PrismaNotificationKind } from '@prisma/client';

/** Los avisos que la persona puede prender o apagar (el aviso de su gimnasio llega siempre). */
type NotificationKind = Exclude<PrismaNotificationKind, 'GYM_MESSAGE'>;
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { can, limitsFor } from '@/server/entitlements';
import { addDaysISO, isoToUtcDate, localTodayISO, weekStartISO } from '@/lib/date';
import { getCheckinStatus } from '@/features/checkin/queries';
import { activeWeekShift, doneWeekdays, weekdayThisWeek } from '@/features/training/weekday';
import { getNotificationPrefs } from './queries';

/** Lo que el teléfono necesita saber para programar los avisos locales de los próximos días. */
export interface ReminderPlan {
  enabled: Partial<Record<NotificationKind, boolean>>;
  /** Días de entrenamiento del plan activo, por día de la semana (1 lunes … 7 domingo). */
  trainingDays: Record<number, { name: string; exercises: number }>;
  /** Lo mismo con los días de siempre (sin el corrimiento de esta semana): rige desde la semana que viene. */
  baseTrainingDays: Record<number, { name: string; exercises: number }>;
  /** Último día (yyyy-mm-dd) de la semana en curso: hasta ahí rige `trainingDays`. */
  weekEndISO: string;
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
    select: {
      weekShift: true,
      weekShiftStart: true,
      days: { select: { id: true, weekday: true, name: true, _count: { select: { exercises: true } } } },
    },
  });
  const weekStart = weekStartISO(todayISO, profile.weekStart);
  const shift = plan ? activeWeekShift(plan, weekStart) : 0;
  const doneRows = await db.workout.findMany({
    where: { status: 'COMPLETED', planDayId: { not: null }, finishedAt: { gte: isoToUtcDate(addDaysISO(weekStart, -1)) } },
    select: { planDayId: true, finishedAt: true },
  });
  const done = doneWeekdays(doneRows, profile.timezone, weekStart);
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
  const baseTrainingDays: ReminderPlan['trainingDays'] = {};
  for (const d of plan?.days ?? []) {
    const info = { name: d.name, exercises: d._count.exercises };
    const weekday = weekdayThisWeek(d, shift, done);
    if (weekday != null) trainingDays[weekday] = info;
    if (d.weekday != null) baseTrainingDays[d.weekday] = info;
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
    baseTrainingDays,
    weekEndISO: addDaysISO(weekStartISO(todayISO, profile.weekStart), 6),
    trainedToday: Boolean(activeOrDone),
    hasStreak: recentDone >= 2,
    mealsToday: meals._count,
    proteinLeftG,
    proteinOk: target ? got >= target.proteinG * 0.8 : false,
    checkinISO,
  };
}
