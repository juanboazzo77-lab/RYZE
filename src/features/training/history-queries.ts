import 'server-only';
import type { ExerciseType, MuscleGroup, Profile, PrType } from '@prisma/client';
import { forUser } from '@/server/user-db';
import { prisma } from '@/server/db';
import { addDaysISO, isoToUtcDate } from '@/lib/date';
import {
  compareToPrev,
  sessionMetrics,
  type Improvements,
  type SessionMetrics,
} from '@/lib/training/progress';

export interface HistoryItem {
  id: string;
  name: string;
  finishedAt: Date | null;
  durationSeconds: number | null;
  perceivedEffort: number | null;
  volume: number;
  exerciseCount: number;
  prCount: number;
}

export async function getWorkoutHistory(profile: Profile, limit = 40): Promise<HistoryItem[]> {
  const db = forUser(profile.id);
  const rows = await db.workout.findMany({
    where: { status: 'COMPLETED' },
    orderBy: { finishedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      finishedAt: true,
      durationSeconds: true,
      perceivedEffort: true,
      _count: { select: { exercises: true, personalRecords: true } },
      exercises: {
        select: {
          sets: {
            where: { isCompleted: true, isWarmup: false },
            select: { weightKg: true, reps: true },
          },
        },
      },
    },
  });

  return rows.map((w) => ({
    id: w.id,
    name: w.name,
    finishedAt: w.finishedAt,
    durationSeconds: w.durationSeconds,
    perceivedEffort: w.perceivedEffort,
    volume: sessionMetrics(w.exercises.flatMap((e) => e.sets)).volume,
    exerciseCount: w._count.exercises,
    prCount: w._count.personalRecords,
  }));
}

export interface CompletedExercise {
  workoutExerciseId: string;
  exerciseId: string;
  name: string;
  type: ExerciseType;
  primaryMuscle: MuscleGroup;
  sets: Array<{
    setNumber: number;
    weightKg: number | null;
    reps: number | null;
    durationSeconds: number | null;
    distanceMeters: number | null;
    isWarmup: boolean;
  }>;
  metrics: SessionMetrics;
  improvements: Improvements;
  prTypes: PrType[];
}
export interface CompletedWorkout {
  id: string;
  name: string;
  finishedAt: Date | null;
  durationSeconds: number | null;
  perceivedEffort: number | null;
  notes: string | null;
  totalVolume: number;
  exercises: CompletedExercise[];
}

export async function getCompletedWorkout(
  profile: Profile,
  workoutId: string,
): Promise<CompletedWorkout | null> {
  const db = forUser(profile.id);
  const w = await db.workout.findFirst({
    where: { id: workoutId, status: 'COMPLETED' },
    select: {
      id: true,
      name: true,
      finishedAt: true,
      durationSeconds: true,
      perceivedEffort: true,
      notes: true,
      exercises: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          exerciseId: true,
          exercise: { select: { name: true, primaryMuscle: true, type: true } },
          sets: {
            orderBy: { setNumber: 'asc' },
            select: {
              setNumber: true,
              weightKg: true,
              reps: true,
              durationSeconds: true,
              distanceMeters: true,
              isWarmup: true,
              isCompleted: true,
            },
          },
        },
      },
      personalRecords: { select: { exerciseId: true, type: true } },
    },
  });
  if (!w) return null;

  const prByExercise = new Map<string, PrType[]>();
  for (const pr of w.personalRecords) {
    prByExercise.set(pr.exerciseId, [...(prByExercise.get(pr.exerciseId) ?? []), pr.type]);
  }

  // Sesión anterior (por ejercicio) para los indicadores de mejora.
  const exerciseIds = [...new Set(w.exercises.map((e) => e.exerciseId))];
  const prevByExercise = new Map<string, SessionMetrics>();
  if (exerciseIds.length > 0 && w.finishedAt) {
    const prev = await db.workout.findMany({
      where: {
        status: 'COMPLETED',
        finishedAt: { lt: w.finishedAt },
        exercises: { some: { exerciseId: { in: exerciseIds } } },
      },
      orderBy: { finishedAt: 'desc' },
      take: 12,
      select: {
        exercises: {
          where: { exerciseId: { in: exerciseIds } },
          select: {
            exerciseId: true,
            sets: {
              where: { isCompleted: true, isWarmup: false },
              select: { weightKg: true, reps: true },
            },
          },
        },
      },
    });
    for (const pw of prev) {
      for (const pe of pw.exercises) {
        if (!prevByExercise.has(pe.exerciseId) && pe.sets.length > 0) {
          prevByExercise.set(pe.exerciseId, sessionMetrics(pe.sets));
        }
      }
    }
  }

  const exercises: CompletedExercise[] = w.exercises.map((e) => {
    const effective = e.sets.filter((s) => s.isCompleted && !s.isWarmup);
    const metrics = sessionMetrics(effective);
    return {
      workoutExerciseId: e.id,
      exerciseId: e.exerciseId,
      name: e.exercise.name,
      type: e.exercise.type,
      primaryMuscle: e.exercise.primaryMuscle,
      sets: e.sets.map((s) => ({
        setNumber: s.setNumber,
        weightKg: s.weightKg,
        reps: s.reps,
        durationSeconds: s.durationSeconds,
        distanceMeters: s.distanceMeters,
        isWarmup: s.isWarmup,
      })),
      metrics,
      improvements: compareToPrev(metrics, prevByExercise.get(e.exerciseId) ?? null),
      prTypes: prByExercise.get(e.exerciseId) ?? [],
    };
  });

  return {
    id: w.id,
    name: w.name,
    finishedAt: w.finishedAt,
    durationSeconds: w.durationSeconds,
    perceivedEffort: w.perceivedEffort,
    notes: w.notes,
    totalVolume: exercises.reduce((s, e) => s + e.metrics.volume, 0),
    exercises,
  };
}

export interface ProgressSession {
  workoutId: string;
  date: string; // yyyy-mm-dd
  metrics: SessionMetrics;
  improvements: Improvements;
}
export interface ExerciseProgress {
  exercise: { id: string; name: string; primaryMuscle: MuscleGroup };
  prs: Partial<Record<PrType, number>>;
  sessions: ProgressSession[];
}

export async function getExerciseProgress(
  profile: Profile,
  exerciseId: string,
  days = 365,
): Promise<ExerciseProgress | null> {
  const db = forUser(profile.id);
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { id: true, name: true, primaryMuscle: true },
  });
  if (!exercise) return null;

  const from = isoToUtcDate(addDaysISO(new Date().toISOString().slice(0, 10), -days));

  const [workouts, prGroups] = await db.$transaction([
    db.workout.findMany({
      where: {
        status: 'COMPLETED',
        finishedAt: { gte: from },
        exercises: { some: { exerciseId } },
      },
      orderBy: { finishedAt: 'asc' },
      select: {
        id: true,
        finishedAt: true,
        exercises: {
          where: { exerciseId },
          select: {
            sets: {
              where: { isCompleted: true, isWarmup: false },
              select: { weightKg: true, reps: true },
            },
          },
        },
      },
    }),
    db.personalRecord.groupBy({
      by: ['type'],
      where: { exerciseId },
      _max: { value: true },
    }),
  ]);

  const prs: Partial<Record<PrType, number>> = {};
  for (const g of prGroups) prs[g.type] = g._max.value ?? 0;

  const sessions: ProgressSession[] = [];
  let prevMetrics: SessionMetrics | null = null;
  for (const w of workouts) {
    const sets = w.exercises.flatMap((e) => e.sets);
    if (sets.length === 0) continue;
    const metrics = sessionMetrics(sets);
    sessions.push({
      workoutId: w.id,
      date: (w.finishedAt ?? new Date()).toISOString().slice(0, 10),
      metrics,
      improvements: compareToPrev(metrics, prevMetrics),
    });
    prevMetrics = metrics;
  }

  return { exercise, prs, sessions };
}
