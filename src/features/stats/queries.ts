import 'server-only';
import type { Profile } from '@prisma/client';
import { forUser } from '@/server/user-db';
import { addDaysISO, isoToUtcDate, localTodayISO } from '@/lib/date';
import { sessionMetrics } from '@/lib/training/progress';
import { computeStats, STATS_WEEKS, type StatsNumbers, type WeeklyPoint } from '@/lib/stats/compute';

export type { WeeklyPoint };

export interface RecentPr {
  id: string;
  exerciseId: string;
  exerciseName: string;
  type: string;
  value: number;
  unit: string;
  achievedAt: Date;
}

export interface StatsPageData extends StatsNumbers {
  recentPrs: RecentPr[];
}

export async function getStatsPage(profile: Profile, weeksCount = STATS_WEEKS): Promise<StatsPageData> {
  const db = forUser(profile.id);
  const todayISO = localTodayISO(profile.timezone);
  const rangeStartISO = addDaysISO(todayISO, -(weeksCount * 7) - 1);
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

  const numbers = computeStats({
    workouts: workouts.flatMap((w) =>
      w.finishedAt ? [{ finishedAt: w.finishedAt.toISOString(), volume: sessionMetrics(w.exercises.flatMap((e) => e.sets)).volume }] : [],
    ),
    foodByDay: foodByDay.map((d) => ({ kcal: d._sum.kcal ?? 0, proteinG: d._sum.proteinG ?? 0 })),
    target: target ? { kcal: target.kcal, proteinG: target.proteinG } : null,
    timezone: profile.timezone,
    weekStart: profile.weekStart,
    now: new Date(),
    weeksCount,
  });

  return {
    ...numbers,
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
