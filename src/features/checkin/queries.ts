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

/**
 * Rendimiento de entrenamiento de la semana vs. plan y semanas previas, como
 * bloque de texto compacto para el Coach. `hasData` es false si no hubo
 * entrenamientos completados.
 */
export async function computeTrainingWeek(
  profile: Profile,
  weekStartStr: string,
): Promise<{ hasData: boolean; block: string }> {
  const db = forUser(profile.id);
  const weekStartDate = isoToUtcDate(weekStartStr);
  const weekEnd = isoToUtcDate(addDaysISO(weekStartStr, 7));
  const prevStart = isoToUtcDate(addDaysISO(weekStartStr, -14));

  const [workouts, plan] = await db.$transaction([
    db.workout.findMany({
      where: { status: 'COMPLETED', finishedAt: { gte: prevStart, lt: weekEnd } },
      select: {
        finishedAt: true,
        exercises: {
          select: {
            exercise: { select: { name: true } },
            sets: {
              where: { isWarmup: false, isCompleted: true },
              select: { weightKg: true, reps: true, rir: true },
            },
          },
        },
      },
    }),
    db.workoutPlan.findFirst({
      where: { isActive: true },
      select: {
        days: {
          select: {
            exercises: {
              select: {
                targetSets: true,
                targetRepsMin: true,
                targetRepsMax: true,
                targetRir: true,
                exercise: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  interface Agg {
    topW: number;
    topR: number;
    vol: number;
    sets: number;
    rirSum: number;
    rirN: number;
  }
  const thisWeek = new Map<string, Agg>();
  const prevWeeks = new Map<string, { topW: number; topR: number }>();

  for (const w of workouts) {
    const inWeek = w.finishedAt && w.finishedAt >= weekStartDate;
    for (const we of w.exercises) {
      const name = we.exercise.name;
      for (const s of we.sets) {
        const kg = s.weightKg ?? 0;
        const reps = s.reps ?? 0;
        if (reps <= 0) continue;
        if (inWeek) {
          const a = thisWeek.get(name) ?? { topW: 0, topR: 0, vol: 0, sets: 0, rirSum: 0, rirN: 0 };
          a.vol += kg * reps;
          a.sets += 1;
          if (s.rir != null) {
            a.rirSum += s.rir;
            a.rirN += 1;
          }
          if (kg > a.topW || (kg === a.topW && reps > a.topR)) {
            a.topW = kg;
            a.topR = reps;
          }
          thisWeek.set(name, a);
        } else {
          const p = prevWeeks.get(name) ?? { topW: 0, topR: 0 };
          if (kg > p.topW || (kg === p.topW && reps > p.topR)) {
            prevWeeks.set(name, { topW: kg, topR: reps });
          }
        }
      }
    }
  }

  if (thisWeek.size === 0) return { hasData: false, block: 'Sin entrenamientos completados esta semana.' };

  const planByName = new Map<string, { sets: number; rMin: number | null; rMax: number | null; rir: number | null }>();
  for (const d of plan?.days ?? []) {
    for (const pe of d.exercises) {
      planByName.set(pe.exercise.name, {
        sets: pe.targetSets,
        rMin: pe.targetRepsMin,
        rMax: pe.targetRepsMax,
        rir: pe.targetRir,
      });
    }
  }

  const lines = [...thisWeek.entries()]
    .sort((a, b) => b[1].vol - a[1].vol)
    .slice(0, 10)
    .map(([name, a]) => {
      const avgRir = a.rirN > 0 ? Math.round((a.rirSum / a.rirN) * 10) / 10 : null;
      const pt = planByName.get(name);
      const target = pt
        ? `objetivo ${pt.sets}x${pt.rMin ?? '?'}-${pt.rMax ?? '?'} @RIR ${pt.rir ?? '?'}`
        : 'sin objetivo en el plan';
      const prev = prevWeeks.get(name);
      const trend = prev
        ? ` · 2 sem antes: ${prev.topW || '–'}kg x ${prev.topR}`
        : '';
      return (
        `  - ${name}: mejor serie ${a.topW || '–'}kg x ${a.topR}` +
        ` (RIR ${avgRir ?? 's/d'}), ${a.sets} series, volumen ${Math.round(a.vol)} · ${target}${trend}`
      );
    });

  return {
    hasData: true,
    block: ['Rendimiento de entrenamiento de la semana (top 10 por volumen):', ...lines].join('\n'),
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
