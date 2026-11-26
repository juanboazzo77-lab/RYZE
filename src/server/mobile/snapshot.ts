import type { PrismaClient } from '@prisma/client';
import type { AppData } from '@/lib/sync/data';
import { MAX_PAST } from '@/lib/sync/workout';
import { PROTOCOL_VERSION, type Snapshot } from '@/lib/sync/protocol';
import { nutritionSnapshot, type NutritionDb } from './nutrition-snapshot';
import { progressSnapshot, type ProgressDb } from './progress-snapshot';

/** Algo más de un año de registros diarios. */
const MAX_WEIGHTS = 400;
/** Alcanza para saber qué se hizo esta semana en cualquier zona horaria, y la anterior. */
const RECENT_DAYS = 15;
/** Entrenamientos anteriores que se miran para saber qué se hizo "la última vez" en cada ejercicio. */
const HISTORY_WORKOUTS = 20;

export type SnapshotDb = Pick<PrismaClient, 'weightEntry' | 'profile' | 'workoutPlan' | 'workout' | 'personalRecord'> & NutritionDb & ProgressDb;

/** Los últimos entrenamientos terminados, con sus series y récords, para el historial sin conexión. */
async function pastWorkouts(db: SnapshotDb) {
  const rows = await db.workout.findMany({
    where: { status: 'COMPLETED', finishedAt: { not: null } },
    orderBy: { finishedAt: 'desc' },
    take: MAX_PAST,
    select: {
      id: true,
      name: true,
      finishedAt: true,
      durationSeconds: true,
      perceivedEffort: true,
      personalRecords: { select: { exerciseId: true, type: true } },
      exercises: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          exerciseId: true,
          exercise: { select: { name: true, type: true } },
          sets: {
            orderBy: { setNumber: 'asc' },
            select: { setNumber: true, weightKg: true, reps: true, durationSeconds: true, distanceMeters: true, isWarmup: true, isCompleted: true },
          },
        },
      },
    },
  });
  return rows.map(({ personalRecords, exercises, finishedAt, ...w }) => ({
    ...w,
    finishedAt: finishedAt!.toISOString(),
    records: personalRecords,
    exercises: exercises.map(({ exercise, ...e }) => ({ ...e, name: exercise.name, type: exercise.type })),
  }));
}

/** Por cada ejercicio de la rutina: las series de la última vez y el récord de peso (igual que en la web). */
async function exerciseHistory(db: SnapshotDb, exerciseIds: string[]) {
  const history: Record<string, { lastTime: Array<{ weightKg: number | null; reps: number | null }>; bestWeightKg: number | null }> = {};
  if (exerciseIds.length === 0) return history;
  const [prior, records] = await Promise.all([
    db.workout.findMany({
      where: { status: 'COMPLETED', exercises: { some: { exerciseId: { in: exerciseIds } } } },
      orderBy: { finishedAt: 'desc' },
      take: HISTORY_WORKOUTS,
      select: {
        exercises: {
          where: { exerciseId: { in: exerciseIds } },
          select: { exerciseId: true, sets: { where: { isCompleted: true }, orderBy: { setNumber: 'asc' }, select: { weightKg: true, reps: true } } },
        },
      },
    }),
    db.personalRecord.findMany({
      where: { exerciseId: { in: exerciseIds }, type: 'MAX_WEIGHT' },
      select: { exerciseId: true, value: true },
    }),
  ]);
  const entry = (id: string) => (history[id] ??= { lastTime: [], bestWeightKg: null });
  for (const w of prior) {
    for (const e of w.exercises) {
      if (e.sets.length > 0 && entry(e.exerciseId).lastTime.length === 0) entry(e.exerciseId).lastTime = e.sets;
    }
  }
  for (const r of records) entry(r.exerciseId).bestWeightKg = Math.max(entry(r.exerciseId).bestWeightKg ?? 0, r.value);
  return history;
}

/**
 * La foto de los datos que la app guarda para mostrarlos sin conexión. `db` tiene que venir acotada a la persona
 * (`forUser`); el perfil se pide por su propio id. Se elige campo por campo: nada de la base viaja por las dudas.
 */
export async function buildSnapshot(
  db: SnapshotDb,
  userId: string,
  now: Date,
  /** Qué incluye su plan (lo calcula quien llama, ver `access.ts`). */
  access?: AppData['access'],
): Promise<Snapshot> {
  const since = new Date(now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000);
  const [profile, weights, plan, recent] = await Promise.all([
    db.profile.findUnique({
      where: { id: userId },
      select: { name: true, email: true, timezone: true, unitSystem: true, weekStart: true, locale: true },
    }),
    db.weightEntry.findMany({
      orderBy: { date: 'desc' },
      take: MAX_WEIGHTS,
      select: { date: true, weightKg: true, note: true },
    }),
    db.workoutPlan.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        weekShift: true,
        weekShiftStart: true,
        days: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            name: true,
            weekday: true,
            exercises: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                exerciseId: true,
                targetSets: true,
                targetRepsMin: true,
                targetRepsMax: true,
                targetRir: true,
                restSeconds: true,
                targetDurationSec: true,
                targetDistanceMeters: true,
                notes: true,
                exercise: { select: { name: true, primaryMuscle: true, type: true } },
              },
            },
          },
        },
      },
    }),
    db.workout.findMany({
      where: { status: 'COMPLETED', planDayId: { not: null }, finishedAt: { gte: since } },
      select: { planDayId: true, finishedAt: true },
    }),
  ]);
  if (!profile) throw new Error('SIN_PERFIL');
  const past = await pastWorkouts(db);
  const nutrition = await nutritionSnapshot(db, profile.timezone, now);
  const progress = await progressSnapshot(db, profile.timezone, now);
  const history = await exerciseHistory(db, [...new Set(plan?.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)) ?? [])]);

  const data: AppData = {
    profile,
    weights: weights.map((w) => ({ date: w.date.toISOString().slice(0, 10), weightKg: w.weightKg, note: w.note })),
    training: {
      plan: plan
        ? {
            id: plan.id,
            name: plan.name,
            weekShift: plan.weekShift,
            weekShiftStart: plan.weekShiftStart ? plan.weekShiftStart.toISOString().slice(0, 10) : null,
            days: plan.days.map((d) => ({
              id: d.id,
              name: d.name,
              weekday: d.weekday,
              exercises: d.exercises.map(({ exercise, ...e }) => ({
                ...e,
                name: exercise.name,
                type: exercise.type,
                primaryMuscle: exercise.primaryMuscle,
              })),
            })),
          }
        : null,
      recentWorkouts: recent.flatMap((w) =>
        w.planDayId && w.finishedAt ? [{ planDayId: w.planDayId, finishedAt: w.finishedAt.toISOString() }] : [],
      ),
      history,
      past,
    },
    nutrition,
    ...progress,
    access,
  };
  return { protocol: PROTOCOL_VERSION, takenAt: now.toISOString(), data };
}
