import 'server-only';
import { DateTime } from 'luxon';
import type { Profile, WorkoutStatus } from '@prisma/client';
import { forUser } from '@/server/user-db';
import { addDaysISO, isoToUtcDate, localTodayISO, weekStartISO } from '@/lib/date';
import {
  nutritionAdherence,
  weeklyWeightChangeKg,
  workoutStreak,
  type DatedWeight,
} from './compute';

export interface Macros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export type TrainingToday =
  | { kind: 'none' }
  | {
      kind: 'workout';
      id: string;
      name: string;
      status: WorkoutStatus;
      exerciseCount: number;
      estMinutes: number;
    }
  | { kind: 'planned'; planDayId: string; name: string; exerciseCount: number; estMinutes: number };

export interface DashboardData {
  todayISO: string;
  nutrition: { target: Macros | null; consumed: Macros };
  training: TrainingToday;
  weight: {
    currentKg: number | null;
    startKg: number | null;
    targetKg: number | null;
    weeklyChangeKg: number | null;
  };
  progress: {
    streak: number;
    weekWorkouts: number;
    weekWorkoutTarget: number;
    adherencePct: number | null;
    adherentDays: number;
    loggedDays: number;
  };
}

const EMPTY_MACROS: Macros = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

export async function getDashboardData(profile: Profile): Promise<DashboardData> {
  const db = forUser(profile.id);
  const tz = profile.timezone;
  const todayISO = localTodayISO(tz);
  const todayDate = isoToUtcDate(todayISO);
  const weekStartDate = isoToUtcDate(weekStartISO(todayISO, profile.weekStart));
  const since14 = isoToUtcDate(addDaysISO(todayISO, -14));
  const todayWeekday = DateTime.fromISO(todayISO, { zone: 'utc' }).weekday; // 1..7

  // Un solo round-trip / una sola conexión (DATABASE_URL usa connection_limit=1,
  // así que Promise.all de muchas queries se pisaría en el pool).
  const [target, todayEntries, weights, goal, existingWorkout, activePlan, completed, weekCount, weekByDay] =
    await db.$transaction([
      db.nutritionTarget.findFirst({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
        select: { kcal: true, proteinG: true, carbsG: true, fatG: true },
      }),
      db.foodEntry.findMany({
        where: { date: todayDate },
        select: { kcal: true, proteinG: true, carbsG: true, fatG: true },
      }),
      db.weightEntry.findMany({
        where: { date: { gte: since14 } },
        orderBy: { date: 'asc' },
        select: { date: true, weightKg: true },
      }),
      db.goal.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        select: { startWeightKg: true, targetWeightKg: true },
      }),
      db.workout.findFirst({
        where: { OR: [{ scheduledFor: todayDate }, { status: 'ACTIVE' }] },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          _count: { select: { exercises: true } },
        },
      }),
      db.workoutPlan.findFirst({
        where: { isActive: true },
        select: {
          days: {
            select: { id: true, name: true, weekday: true, _count: { select: { exercises: true } } },
          },
        },
      }),
      db.workout.findMany({
        where: { status: 'COMPLETED', finishedAt: { not: null } },
        orderBy: { finishedAt: 'desc' },
        take: 120,
        select: { finishedAt: true },
      }),
      db.workout.count({ where: { status: 'COMPLETED', finishedAt: { gte: weekStartDate } } }),
      db.foodEntry.groupBy({
        by: ['date'],
        where: { date: { gte: weekStartDate } },
        _sum: { kcal: true, proteinG: true },
        orderBy: { date: 'asc' },
      }),
    ]);

  // --- Nutrición ---
  const consumed = todayEntries.reduce<Macros>(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      proteinG: acc.proteinG + e.proteinG,
      carbsG: acc.carbsG + e.carbsG,
      fatG: acc.fatG + e.fatG,
    }),
    { ...EMPTY_MACROS },
  );
  const roundedConsumed: Macros = {
    kcal: Math.round(consumed.kcal),
    proteinG: Math.round(consumed.proteinG),
    carbsG: Math.round(consumed.carbsG),
    fatG: Math.round(consumed.fatG),
  };

  // --- Peso ---
  const datedWeights: DatedWeight[] = weights.map((w) => ({
    date: w.date.toISOString().slice(0, 10),
    weightKg: w.weightKg,
  }));
  const currentKg = datedWeights.at(-1)?.weightKg ?? null;
  const weeklyChangeKg = weeklyWeightChangeKg(datedWeights, todayISO, addDaysISO);

  // --- Entrenamiento de hoy ---
  const estMinutes = profile.sessionMinutes ?? 45;
  let training: TrainingToday = { kind: 'none' };
  if (existingWorkout) {
    training = {
      kind: 'workout',
      id: existingWorkout.id,
      name: existingWorkout.name,
      status: existingWorkout.status,
      exerciseCount: existingWorkout._count.exercises,
      estMinutes,
    };
  } else if (activePlan) {
    const day = activePlan.days.find((d) => d.weekday === todayWeekday);
    if (day) {
      training = {
        kind: 'planned',
        planDayId: day.id,
        name: day.name,
        exerciseCount: day._count.exercises,
        estMinutes,
      };
    }
  }

  // --- Progreso ---
  const completedDays = new Set(
    completed
      .map((w) => (w.finishedAt ? DateTime.fromJSDate(w.finishedAt).setZone(tz).toISODate() : null))
      .filter((d): d is string => Boolean(d)),
  );
  const streak = workoutStreak(completedDays, todayISO, addDaysISO);

  const adherence = target
    ? nutritionAdherence(
        weekByDay.map((d) => ({
          kcal: d._sum.kcal ?? 0,
          proteinG: d._sum.proteinG ?? 0,
        })),
        { kcal: target.kcal, proteinG: target.proteinG },
      )
    : { adherentDays: 0, loggedDays: weekByDay.length, pct: null };

  return {
    todayISO,
    nutrition: { target: target ?? null, consumed: roundedConsumed },
    training,
    weight: {
      currentKg,
      startKg: goal?.startWeightKg ?? null,
      targetKg: goal?.targetWeightKg ?? null,
      weeklyChangeKg,
    },
    progress: {
      streak,
      weekWorkouts: weekCount,
      weekWorkoutTarget: profile.daysAvailable ?? 3,
      adherencePct: adherence.pct,
      adherentDays: adherence.adherentDays,
      loggedDays: adherence.loggedDays,
    },
  };
}
