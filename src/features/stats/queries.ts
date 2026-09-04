import 'server-only';
import type { Profile } from '@prisma/client';
import { forUser } from '@/server/user-db';
import { addDaysISO, isoToUtcDate, localTodayISO, weekStartISO } from '@/lib/date';
import { sessionMetrics } from '@/lib/training/progress';
import { nutritionAdherence } from '@/features/dashboard/compute';

export interface WeeklyPoint {
  weekStartISO: string;
  label: string;
  workouts: number;
  volume: number;
}

export interface RecentPr {
  id: string;
  exerciseId: string;
  exerciseName: string;
  type: string;
  value: number;
  unit: string;
  achievedAt: Date;
}

export interface StatsPageData {
  weeks: WeeklyPoint[];
  avgKcal: number | null;
  avgProtein: number | null;
  adherencePct: number | null;
  loggedDays: number;
  recentPrs: RecentPr[];
}

export async function getStatsPage(profile: Profile, weeksCount = 8): Promise<StatsPageData> {
  const db = forUser(profile.id);
  const todayISO = localTodayISO(profile.timezone);
  const rangeStartISO = addDaysISO(todayISO, -(weeksCount * 7));
  const rangeStart = isoToUtcDate(rangeStartISO);
  const last30 = isoToUtcDate(addDaysISO(todayISO, -30));

  const [workouts, foodByDay, target, prs] = await db.$transaction([
    db.workout.findMany({
      where: { status: 'COMPLETED', finishedAt: { gte: rangeStart } },
      select: {
        finishedAt: true,
        exercises: {
          select: {
            sets: {
              where: { isCompleted: true, isWarmup: false },
              select: { weightKg: true, reps: true },
            },
          },
        },
      },
    }),
    db.foodEntry.groupBy({
      by: ['date'],
      where: { date: { gte: last30 } },
      _sum: { kcal: true, proteinG: true },
    }),
    db.nutritionTarget.findFirst({ where: { active: true }, select: { kcal: true, proteinG: true } }),
    db.personalRecord.findMany({
      orderBy: { achievedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        exerciseId: true,
        type: true,
        value: true,
        unit: true,
        achievedAt: true,
        exercise: { select: { name: true } },
      },
    }),
  ]);

  // Bucket por semana (weekStart del usuario).
  const buckets = new Map<string, { workouts: number; volume: number }>();
  for (const w of workouts) {
    if (!w.finishedAt) continue;
    const dateISO = w.finishedAt.toISOString().slice(0, 10);
    const wk = weekStartISO(dateISO, profile.weekStart);
    const b = buckets.get(wk) ?? { workouts: 0, volume: 0 };
    b.workouts += 1;
    b.volume += sessionMetrics(w.exercises.flatMap((e) => e.sets)).volume;
    buckets.set(wk, b);
  }

  const weeks: WeeklyPoint[] = [];
  const currentWeekStart = weekStartISO(todayISO, profile.weekStart);
  for (let i = weeksCount - 1; i >= 0; i--) {
    const wk = addDaysISO(currentWeekStart, -7 * i);
    const b = buckets.get(wk) ?? { workouts: 0, volume: 0 };
    weeks.push({
      weekStartISO: wk,
      label: wk.slice(5).replace('-', '/'),
      workouts: b.workouts,
      volume: Math.round(b.volume),
    });
  }

  const kcalRows = foodByDay.map((d) => d._sum.kcal ?? 0).filter((v) => v > 0);
  const proteinRows = foodByDay.map((d) => d._sum.proteinG ?? 0).filter((v) => v > 0);
  const avgKcal = kcalRows.length ? Math.round(kcalRows.reduce((a, b) => a + b, 0) / kcalRows.length) : null;
  const avgProtein = proteinRows.length
    ? Math.round(proteinRows.reduce((a, b) => a + b, 0) / proteinRows.length)
    : null;

  const adherence = target
    ? nutritionAdherence(
        foodByDay.map((d) => ({ kcal: d._sum.kcal ?? 0, proteinG: d._sum.proteinG ?? 0 })),
        { kcal: target.kcal, proteinG: target.proteinG },
      )
    : { pct: null, loggedDays: foodByDay.length };

  return {
    weeks,
    avgKcal,
    avgProtein,
    adherencePct: adherence.pct,
    loggedDays: foodByDay.length,
    recentPrs: prs.map((p) => ({
      id: p.id,
      exerciseId: p.exerciseId,
      exerciseName: p.exercise.name,
      type: p.type,
      value: p.value,
      unit: p.unit,
      achievedAt: p.achievedAt,
    })),
  };
}
