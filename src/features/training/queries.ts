import 'server-only';
import type { MuscleGroup, Profile, WorkoutStatus } from '@prisma/client';
import { forUser } from '@/server/user-db';

export interface OverviewDay {
  id: string;
  name: string;
  weekday: number | null;
  exerciseCount: number;
}
export interface OverviewPlan {
  id: string;
  name: string;
  isActive: boolean;
  dayCount: number;
}
export interface TrainingOverview {
  activeWorkout: { id: string; name: string; startedAt: Date | null } | null;
  activePlan: { id: string; name: string; days: OverviewDay[] } | null;
  plans: OverviewPlan[];
}

export async function getTrainingOverview(profile: Profile): Promise<TrainingOverview> {
  const db = forUser(profile.id);

  const [activeWorkout, activePlan, plans] = await db.$transaction([
    db.workout.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' },
      select: { id: true, name: true, startedAt: true },
    }),
    db.workoutPlan.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        days: {
          orderBy: { orderIndex: 'asc' },
          select: { id: true, name: true, weekday: true, _count: { select: { exercises: true } } },
        },
      },
    }),
    db.workoutPlan.findMany({
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      select: { id: true, name: true, isActive: true, _count: { select: { days: true } } },
    }),
  ]);

  return {
    activeWorkout: activeWorkout ?? null,
    activePlan: activePlan
      ? {
          id: activePlan.id,
          name: activePlan.name,
          days: activePlan.days.map((d) => ({
            id: d.id,
            name: d.name,
            weekday: d.weekday,
            exerciseCount: d._count.exercises,
          })),
        }
      : null,
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      isActive: p.isActive,
      dayCount: p._count.days,
    })),
  };
}

export interface EditorExercise {
  id: string;
  exerciseId: string;
  name: string;
  primaryMuscle: MuscleGroup;
  orderIndex: number;
  targetSets: number;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetRir: number | null;
  restSeconds: number | null;
  notes: string | null;
}
export interface EditorDay {
  id: string;
  name: string;
  weekday: number | null;
  orderIndex: number;
  exercises: EditorExercise[];
}
export interface PlanEditor {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  days: EditorDay[];
}

export async function getPlanEditor(profile: Profile, planId: string): Promise<PlanEditor | null> {
  const db = forUser(profile.id);
  const plan = await db.workoutPlan.findFirst({
    where: { id: planId },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      days: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          name: true,
          weekday: true,
          orderIndex: true,
          exercises: {
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true,
              exerciseId: true,
              orderIndex: true,
              targetSets: true,
              targetRepsMin: true,
              targetRepsMax: true,
              targetRir: true,
              restSeconds: true,
              notes: true,
              exercise: { select: { name: true, primaryMuscle: true } },
            },
          },
        },
      },
    },
  });
  if (!plan) return null;

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    isActive: plan.isActive,
    days: plan.days.map((d) => ({
      id: d.id,
      name: d.name,
      weekday: d.weekday,
      orderIndex: d.orderIndex,
      exercises: d.exercises.map((e) => ({
        id: e.id,
        exerciseId: e.exerciseId,
        name: e.exercise.name,
        primaryMuscle: e.exercise.primaryMuscle,
        orderIndex: e.orderIndex,
        targetSets: e.targetSets,
        targetRepsMin: e.targetRepsMin,
        targetRepsMax: e.targetRepsMax,
        targetRir: e.targetRir,
        restSeconds: e.restSeconds,
        notes: e.notes,
      })),
    })),
  };
}

export interface SessionSet {
  id: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rir: number | null;
  isWarmup: boolean;
  isCompleted: boolean;
}
export interface SessionExercise {
  id: string;
  exerciseId: string;
  name: string;
  primaryMuscle: MuscleGroup;
  orderIndex: number;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetRir: number | null;
  restSeconds: number | null;
  notes: string | null;
  sets: SessionSet[];
  lastTime: Array<{ weightKg: number | null; reps: number | null }> | null;
}
export interface WorkoutSession {
  id: string;
  name: string;
  status: WorkoutStatus;
  startedAt: string | null;
  exercises: SessionExercise[];
}

export async function getWorkoutSession(
  profile: Profile,
  workoutId: string,
): Promise<WorkoutSession | null> {
  const db = forUser(profile.id);
  const w = await db.workout.findFirst({
    where: { id: workoutId },
    select: {
      id: true,
      name: true,
      status: true,
      startedAt: true,
      exercises: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          exerciseId: true,
          orderIndex: true,
          targetRepsMin: true,
          targetRepsMax: true,
          targetRir: true,
          restSeconds: true,
          notes: true,
          exercise: { select: { name: true, primaryMuscle: true } },
          sets: {
            orderBy: { setNumber: 'asc' },
            select: {
              id: true,
              setNumber: true,
              weightKg: true,
              reps: true,
              rir: true,
              isWarmup: true,
              isCompleted: true,
            },
          },
        },
      },
    },
  });
  if (!w) return null;

  // "Última vez": para cada ejercicio, las series completadas del entrenamiento
  // COMPLETADO más reciente que lo incluyó.
  const exerciseIds = w.exercises.map((e) => e.exerciseId);
  const lastByExercise = new Map<string, Array<{ weightKg: number | null; reps: number | null }>>();
  if (exerciseIds.length > 0) {
    const prior = await db.workout.findMany({
      where: {
        status: 'COMPLETED',
        id: { not: workoutId },
        exercises: { some: { exerciseId: { in: exerciseIds } } },
      },
      orderBy: { finishedAt: 'desc' },
      take: 8,
      select: {
        finishedAt: true,
        exercises: {
          where: { exerciseId: { in: exerciseIds } },
          select: {
            exerciseId: true,
            sets: {
              where: { isCompleted: true },
              orderBy: { setNumber: 'asc' },
              select: { weightKg: true, reps: true },
            },
          },
        },
      },
    });
    for (const pw of prior) {
      for (const pe of pw.exercises) {
        if (!lastByExercise.has(pe.exerciseId) && pe.sets.length > 0) {
          lastByExercise.set(pe.exerciseId, pe.sets);
        }
      }
    }
  }

  return {
    id: w.id,
    name: w.name,
    status: w.status,
    startedAt: w.startedAt ? w.startedAt.toISOString() : null,
    exercises: w.exercises.map((e) => ({
      id: e.id,
      exerciseId: e.exerciseId,
      name: e.exercise.name,
      primaryMuscle: e.exercise.primaryMuscle,
      orderIndex: e.orderIndex,
      targetRepsMin: e.targetRepsMin,
      targetRepsMax: e.targetRepsMax,
      targetRir: e.targetRir,
      restSeconds: e.restSeconds,
      notes: e.notes,
      sets: e.sets,
      lastTime: lastByExercise.get(e.exerciseId) ?? null,
    })),
  };
}
