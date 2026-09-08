import 'server-only';
import { DateTime } from 'luxon';
import type { Profile, WeeklyCheckin } from '@prisma/client';
import { forUser } from '@/server/user-db';
import { addDaysISO, isoToUtcDate, localTodayISO, weekStartISO } from '@/lib/date';
import { nutritionAdherence } from '@/features/dashboard/compute';

export interface WeekStats {
  weekStartISO: string;
  avgWeightKg: number | null;
  weightChangeKg: number | null;
  kcalAdherencePct: number | null;
  proteinAdherencePct: number | null;
  workoutsCompleted: number;
  workoutsPlanned: number;
  avgSteps: number | null;
}

export async function computeWeekStats(profile: Profile, weekStartStr: string): Promise<WeekStats> {
  const db = forUser(profile.id);
  const weekStartDate = isoToUtcDate(weekStartStr);
  const weekEndExclusive = isoToUtcDate(addDaysISO(weekStartStr, 7));

  const [weights, target, foodByDay, workoutsCompleted, activity] = await db.$transaction([
    db.weightEntry.findMany({
      where: { date: { gte: weekStartDate, lt: weekEndExclusive } },
      orderBy: { date: 'asc' },
      select: { weightKg: true },
    }),
    db.nutritionTarget.findFirst({ where: { active: true }, select: { kcal: true, proteinG: true } }),
    db.foodEntry.groupBy({
      by: ['date'],
      where: { date: { gte: weekStartDate, lt: weekEndExclusive } },
      _sum: { kcal: true, proteinG: true },
    }),
    db.workout.count({
      where: { status: 'COMPLETED', finishedAt: { gte: weekStartDate, lt: weekEndExclusive } },
    }),
    db.dailyActivity.aggregate({
      where: { date: { gte: weekStartDate, lt: weekEndExclusive } },
      _avg: { steps: true },
    }),
  ]);

  const avgWeightKg =
    weights.length > 0
      ? Math.round((weights.reduce((s, w) => s + w.weightKg, 0) / weights.length) * 10) / 10
      : null;
  const weightChangeKg =
    weights.length >= 2
      ? Math.round((weights[weights.length - 1]!.weightKg - weights[0]!.weightKg) * 10) / 10
      : null;

  const adherence = target
    ? nutritionAdherence(
        foodByDay.map((d) => ({ kcal: d._sum.kcal ?? 0, proteinG: d._sum.proteinG ?? 0 })),
        { kcal: target.kcal, proteinG: target.proteinG },
      )
    : { pct: null };

  const proteinDays = target
    ? foodByDay.filter((d) => (d._sum.proteinG ?? 0) >= target.proteinG * 0.9).length
    : 0;
  const proteinAdherencePct =
    target && foodByDay.length > 0 ? Math.round((proteinDays / foodByDay.length) * 100) : null;

  return {
    weekStartISO: weekStartStr,
    avgWeightKg,
    weightChangeKg,
    kcalAdherencePct: adherence.pct,
    proteinAdherencePct,
    workoutsCompleted,
    workoutsPlanned: profile.daysAvailable ?? 3,
    avgSteps: activity._avg.steps !== null ? Math.round(activity._avg.steps) : null,
  };
}

export interface CheckinPageData {
  todayISO: string;
  currentWeekStart: string;
  currentStats: WeekStats;
  existing: WeeklyCheckin | null;
  history: WeeklyCheckin[];
}

export async function getCheckinPage(profile: Profile): Promise<CheckinPageData> {
  const db = forUser(profile.id);
  const todayISO = localTodayISO(profile.timezone);
  const currentWeekStart = weekStartISO(todayISO, profile.weekStart);

  const [existing, history] = await db.$transaction([
    db.weeklyCheckin.findFirst({ where: { weekStart: isoToUtcDate(currentWeekStart) } }),
    db.weeklyCheckin.findMany({ orderBy: { weekStart: 'desc' }, take: 12 }),
  ]);

  const currentStats = await computeWeekStats(profile, currentWeekStart);

  return { todayISO, currentWeekStart, currentStats, existing, history };
}

/**
 * ¿Toca mostrar el recordatorio de la revisión semanal? True si el usuario
 * activó el recordatorio, ya pasó (o es) el día elegido de esta semana, y
 * todavía no hizo el check-in de la semana en curso.
 */
export async function isCheckinDue(profile: Profile): Promise<boolean> {
  const db = forUser(profile.id);
  const todayISO = localTodayISO(profile.timezone);
  const weekStartDate = isoToUtcDate(weekStartISO(todayISO, profile.weekStart));
  const todayWeekday = DateTime.fromISO(todayISO, { zone: 'utc' }).weekday; // 1..7

  const [pref, existing] = await db.$transaction([
    db.notificationPreference.findFirst({
      where: { kind: 'WEEKLY_CHECKIN' },
      select: { enabled: true, dayOfWeek: true },
    }),
    db.weeklyCheckin.findFirst({ where: { weekStart: weekStartDate }, select: { id: true } }),
  ]);

  if (existing) return false;
  const enabled = pref?.enabled ?? true;
  const day = pref?.dayOfWeek ?? 1;
  return enabled && todayWeekday >= day;
}
