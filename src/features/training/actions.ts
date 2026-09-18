'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Locale } from '@prisma/client';
import { requireUser } from '@/server/context';
import { forUser, type UserDb } from '@/server/user-db';
import { prisma } from '@/server/db';
import {
  addDaySchema,
  addPlanExerciseSchema,
  addWorkoutExerciseSchema,
  createExerciseSchema,
  createPlanSchema,
  finishWorkoutSchema,
  idSchema,
  reorderSchema,
  saveWorkoutSchema,
  startWorkoutSchema,
  updateDaySchema,
  updatePlanExerciseSchema,
  updatePlanSchema,
  type AddDayInput,
  type AddPlanExerciseInput,
  type AddWorkoutExerciseInput,
  type CreateExerciseInput,
  type CreatePlanInput,
  type FinishWorkoutInput,
  type SaveWorkoutInput,
  type StartWorkoutInput,
  type UpdateDayInput,
  type UpdatePlanExerciseInput,
  type UpdatePlanInput,
} from './schema';

const FREE_WORKOUT_NAME: Record<Locale, string> = {
  ES: 'Entrenamiento libre',
  EN: 'Free workout',
  PT: 'Treino livre',
  FR: 'Séance libre',
  DE: 'Freies Training',
  IT: 'Allenamento libero',
};

export interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

const DEFAULT_SETS = 3;
const DEFAULT_CARDIO_DURATION_SEC = 1800;

async function ownsPlan(db: UserDb, planId: string) {
  return Boolean(await db.workoutPlan.findFirst({ where: { id: planId }, select: { id: true } }));
}
async function ownsPlanViaDay(db: UserDb, planDayId: string) {
  const p = await db.workoutPlan.findFirst({
    where: { days: { some: { id: planDayId } } },
    select: { id: true },
  });
  return p?.id ?? null;
}
async function ownsPlanViaExercise(db: UserDb, planExerciseId: string) {
  return Boolean(
    await db.workoutPlan.findFirst({
      where: { days: { some: { exercises: { some: { id: planExerciseId } } } } },
      select: { id: true },
    }),
  );
}
async function ownsWorkoutViaExercise(db: UserDb, workoutExerciseId: string) {
  return Boolean(
    await db.workout.findFirst({
      where: { exercises: { some: { id: workoutExerciseId } } },
      select: { id: true },
    }),
  );
}

/* ============================ PLANES ============================ */

export async function createPlan(raw: CreatePlanInput): Promise<never | Result> {
  const parsed = createPlanSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const db = forUser(userId);
  const plan = await db.workoutPlan.create({
    data: { userId, name: parsed.data.name, source: 'MANUAL' },
    select: { id: true },
  });
  revalidatePath('/training');
  redirect(`/training/plans/${plan.id}`);
}

export async function updatePlan(raw: UpdatePlanInput): Promise<Result> {
  const parsed = updatePlanSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const d = parsed.data;
  const { userId } = await requireUser();
  const db = forUser(userId);
  if (!(await ownsPlan(db, d.id))) return { error: 'FORBIDDEN' };

  const ops = [];
  if (d.isActive === true) {
    ops.push(db.workoutPlan.updateMany({ where: { isActive: true }, data: { isActive: false } }));
  }
  ops.push(
    db.workoutPlan.updateMany({
      where: { id: d.id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
      },
    }),
  );
  await db.$transaction(ops);
  revalidatePath('/training');
  revalidatePath(`/training/plans/${d.id}`);
  return { ok: true };
}

export async function deletePlan(raw: { id: string }): Promise<never | Result> {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, profile } = await requireUser();
  const db = forUser(userId);
  const plan = await db.workoutPlan.findFirst({
    where: { id: parsed.data.id },
    select: { source: true },
  });
  await db.workoutPlan.deleteMany({ where: { id: parsed.data.id } });
  if (plan?.source === 'AI') {
    // Le devolvemos el lugar en el cupo mensual: si borra una rutina de IA
    // que no le sirvió, puede generar otra en su lugar sin esperar al mes que viene.
    const { refundPlanGeneration } = await import('@/server/ai/usage');
    await refundPlanGeneration(userId, profile.timezone).catch(() => {});
  }
  revalidatePath('/training');
  redirect('/training');
}

export async function addPlanDay(raw: AddDayInput): Promise<Result> {
  const parsed = addDaySchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const db = forUser(userId);
  if (!(await ownsPlan(db, parsed.data.planId))) return { error: 'FORBIDDEN' };
  const count = await db.planDay.count({ where: { planId: parsed.data.planId } });
  await db.planDay.create({
    data: { planId: parsed.data.planId, name: parsed.data.name, orderIndex: count },
  });
  revalidatePath(`/training/plans/${parsed.data.planId}`);
  return { ok: true };
}

export async function updatePlanDay(raw: UpdateDayInput): Promise<Result> {
  const parsed = updateDaySchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const d = parsed.data;
  const { userId } = await requireUser();
  const db = forUser(userId);
  const planId = await ownsPlanViaDay(db, d.id);
  if (!planId) return { error: 'FORBIDDEN' };
  await db.planDay.updateMany({
    where: { id: d.id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.weekday !== undefined ? { weekday: d.weekday } : {}),
    },
  });
  revalidatePath(`/training/plans/${planId}`);
  return { ok: true };
}

export async function deletePlanDay(raw: { id: string }): Promise<Result> {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const db = forUser(userId);
  const planId = await ownsPlanViaDay(db, parsed.data.id);
  if (!planId) return { error: 'FORBIDDEN' };
  await db.planDay.deleteMany({ where: { id: parsed.data.id } });
  revalidatePath(`/training/plans/${planId}`);
  return { ok: true };
}

export async function addPlanExercise(raw: AddPlanExerciseInput): Promise<Result> {
  const parsed = addPlanExerciseSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const db = forUser(userId);
  const planId = await ownsPlanViaDay(db, parsed.data.planDayId);
  if (!planId) return { error: 'FORBIDDEN' };

  const exercise = await prisma.exercise.findUnique({ where: { id: parsed.data.exerciseId } });
  if (!exercise || (exercise.isCustom && exercise.createdById !== userId)) {
    return { error: 'EXERCISE_NOT_FOUND' };
  }
  const count = await db.planExercise.count({ where: { planDayId: parsed.data.planDayId } });
  await db.planExercise.create({
    data:
      exercise.type === 'CARDIO'
        ? {
            planDayId: parsed.data.planDayId,
            exerciseId: parsed.data.exerciseId,
            orderIndex: count,
            targetSets: 1,
            targetDurationSec: DEFAULT_CARDIO_DURATION_SEC,
          }
        : {
            planDayId: parsed.data.planDayId,
            exerciseId: parsed.data.exerciseId,
            orderIndex: count,
            targetSets: DEFAULT_SETS,
            targetRepsMin: 8,
            targetRepsMax: 12,
            restSeconds: 90,
          },
  });
  revalidatePath(`/training/plans/${planId}`);
  return { ok: true };
}

export async function updatePlanExercise(raw: UpdatePlanExerciseInput): Promise<Result> {
  const parsed = updatePlanExerciseSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const d = parsed.data;
  const { userId } = await requireUser();
  const db = forUser(userId);
  if (!(await ownsPlanViaExercise(db, d.id))) return { error: 'FORBIDDEN' };

  const { id, ...rest } = d;
  await db.planExercise.updateMany({ where: { id }, data: rest });
  revalidatePath('/training/plans/[planId]', 'page');
  return { ok: true };
}

export async function deletePlanExercise(raw: { id: string }): Promise<Result> {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const db = forUser(userId);
  if (!(await ownsPlanViaExercise(db, parsed.data.id))) return { error: 'FORBIDDEN' };
  await db.planExercise.deleteMany({ where: { id: parsed.data.id } });
  revalidatePath('/training/plans/[planId]', 'page');
  return { ok: true };
}

export async function reorderPlanExercises(
  raw: { planDayId: string } & { ids: string[] },
): Promise<Result> {
  const parsed = reorderSchema.safeParse(raw);
  const dayId = idSchema.shape.id.safeParse((raw as { planDayId?: string }).planDayId);
  if (!parsed.success || !dayId.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const db = forUser(userId);
  const planId = await ownsPlanViaDay(db, dayId.data);
  if (!planId) return { error: 'FORBIDDEN' };
  await db.$transaction(
    parsed.data.ids.map((id, i) =>
      db.planExercise.updateMany({ where: { id, planDayId: dayId.data }, data: { orderIndex: i } }),
    ),
  );
  revalidatePath(`/training/plans/${planId}`);
  return { ok: true };
}

/* ============================ BIBLIOTECA ============================ */

export async function createExercise(raw: CreateExerciseInput): Promise<Result<{ id: string }>> {
  const parsed = createExerciseSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const ex = await prisma.exercise.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      primaryMuscle: parsed.data.primaryMuscle,
      equipment: parsed.data.equipment || null,
      isCustom: true,
      createdById: userId,
    },
    select: { id: true },
  });
  return { ok: true, data: { id: ex.id } };
}

export async function searchExercisesAction(query: string) {
  const { userId } = await requireUser();
  const { searchExercises } = await import('@/server/training/exercise-search');
  return searchExercises(userId, query, 30);
}

/* ============================ SESIÓN ============================ */

export async function startWorkout(raw: StartWorkoutInput): Promise<never | Result> {
  const parsed = startWorkoutSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, profile } = await requireUser();
  const db = forUser(userId);

  const existing = await db.workout.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true },
  });
  if (existing) redirect(`/training/session/${existing.id}`);

  if (parsed.data.planDayId) {
    const owned = await db.workoutPlan.findFirst({
      where: { days: { some: { id: parsed.data.planDayId } } },
      select: {
        id: true,
        days: {
          where: { id: parsed.data.planDayId },
          select: {
            name: true,
            exercises: {
              orderBy: { orderIndex: 'asc' },
              select: {
                exerciseId: true,
                orderIndex: true,
                targetSets: true,
                targetRepsMin: true,
                targetRepsMax: true,
                targetRir: true,
                restSeconds: true,
                targetDurationSec: true,
                targetDistanceMeters: true,
                notes: true,
              },
            },
          },
        },
      },
    });
    const pd = owned?.days[0];
    if (!owned || !pd) return { error: 'NOT_FOUND' };

    const w = await db.workout.create({
      data: {
        userId,
        planId: owned.id,
        planDayId: parsed.data.planDayId,
        name: pd.name,
        status: 'ACTIVE',
        startedAt: new Date(),
        exercises: {
          create: pd.exercises.map((pe) => ({
            exerciseId: pe.exerciseId,
            orderIndex: pe.orderIndex,
            targetRepsMin: pe.targetRepsMin,
            targetRepsMax: pe.targetRepsMax,
            targetRir: pe.targetRir,
            restSeconds: pe.restSeconds,
            targetDurationSec: pe.targetDurationSec,
            targetDistanceMeters: pe.targetDistanceMeters,
            notes: pe.notes,
            sets: {
              create: Array.from({ length: Math.max(1, pe.targetSets) }, (_, i) => ({
                setNumber: i + 1,
                isWarmup: false,
                isCompleted: false,
              })),
            },
          })),
        },
      },
      select: { id: true },
    });
    revalidatePath('/training');
    redirect(`/training/session/${w.id}`);
  }

  const w = await db.workout.create({
    data: {
      userId,
      name: FREE_WORKOUT_NAME[profile.locale],
      status: 'ACTIVE',
      startedAt: new Date(),
    },
    select: { id: true },
  });
  revalidatePath('/training');
  redirect(`/training/session/${w.id}`);
}

export async function addWorkoutExercise(
  raw: AddWorkoutExerciseInput,
): Promise<Result<{ id: string; exerciseId: string; setIds: string[] }>> {
  const parsed = addWorkoutExerciseSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const db = forUser(userId);

  const workout = await db.workout.findFirst({
    where: { id: parsed.data.workoutId },
    select: { id: true, _count: { select: { exercises: true } } },
  });
  if (!workout) return { error: 'FORBIDDEN' };

  const exercise = await prisma.exercise.findUnique({ where: { id: parsed.data.exerciseId } });
  if (!exercise || (exercise.isCustom && exercise.createdById !== userId)) {
    return { error: 'EXERCISE_NOT_FOUND' };
  }

  const we = await db.workoutExercise.create({
    data:
      exercise.type === 'CARDIO'
        ? {
            workoutId: parsed.data.workoutId,
            exerciseId: parsed.data.exerciseId,
            orderIndex: workout._count.exercises,
            targetDurationSec: DEFAULT_CARDIO_DURATION_SEC,
            sets: { create: [{ setNumber: 1, isWarmup: false, isCompleted: false }] },
          }
        : {
            workoutId: parsed.data.workoutId,
            exerciseId: parsed.data.exerciseId,
            orderIndex: workout._count.exercises,
            restSeconds: 90,
            targetRepsMin: 8,
            targetRepsMax: 12,
            sets: {
              create: Array.from({ length: DEFAULT_SETS }, (_, i) => ({
                setNumber: i + 1,
                isWarmup: false,
                isCompleted: false,
              })),
            },
          },
    select: { id: true, exerciseId: true, sets: { orderBy: { setNumber: 'asc' }, select: { id: true } } },
  });

  revalidatePath(`/training/session/${parsed.data.workoutId}`);
  return { ok: true, data: { id: we.id, exerciseId: we.exerciseId, setIds: we.sets.map((s) => s.id) } };
}

export async function removeWorkoutExercise(raw: { id: string }): Promise<Result> {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const db = forUser(userId);
  if (!(await ownsWorkoutViaExercise(db, parsed.data.id))) return { error: 'FORBIDDEN' };
  await db.workoutExercise.delete({ where: { id: parsed.data.id } });
  return { ok: true };
}

export async function saveWorkout(raw: SaveWorkoutInput): Promise<Result> {
  const parsed = saveWorkoutSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const d = parsed.data;
  const { userId } = await requireUser();
  const db = forUser(userId);

  const workout = await db.workout.findFirst({
    where: { id: d.workoutId },
    select: {
      status: true,
      exercises: { select: { id: true, sets: { select: { id: true } } } },
    },
  });
  if (!workout) return { error: 'FORBIDDEN' };
  if (workout.status === 'COMPLETED') return { error: 'ALREADY_FINISHED' };

  const validWe = new Set(workout.exercises.map((e) => e.id));
  const validSets = new Set(workout.exercises.flatMap((e) => e.sets.map((s) => s.id)));

  if (d.sets.some((s) => !validWe.has(s.workoutExerciseId))) return { error: 'BAD_EXERCISE' };
  if ((d.deletedSetIds ?? []).some((id) => !validSets.has(id))) return { error: 'BAD_SET' };

  const ops = [];
  if (d.deletedSetIds && d.deletedSetIds.length > 0) {
    ops.push(db.workoutSet.deleteMany({ where: { id: { in: d.deletedSetIds } } }));
  }
  for (const s of d.sets) {
    const data = {
      setNumber: s.setNumber,
      weightKg: s.weightKg,
      reps: s.reps,
      durationSeconds: s.durationSeconds,
      distanceMeters: s.distanceMeters,
      rir: s.rir,
      isWarmup: s.isWarmup,
      isCompleted: s.isCompleted,
      completedAt: s.isCompleted ? new Date() : null,
    };
    // Upsert por id generado en el cliente: si ya existe se actualiza, si no se crea.
    if (validSets.has(s.id)) {
      ops.push(db.workoutSet.update({ where: { id: s.id }, data }));
    } else {
      ops.push(
        db.workoutSet.create({
          data: { id: s.id, workoutExerciseId: s.workoutExerciseId, ...data },
        }),
      );
    }
  }
  ops.push(db.workout.updateMany({ where: { id: d.workoutId }, data: { updatedAt: new Date() } }));

  await db.$transaction(ops);
  return { ok: true };
}

export async function finishWorkout(raw: FinishWorkoutInput): Promise<never | Result> {
  const parsed = finishWorkoutSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const d = parsed.data;
  const { userId, profile } = await requireUser();
  const db = forUser(userId);

  const w = await db.workout.findFirst({
    where: { id: d.workoutId },
    select: { startedAt: true, status: true },
  });
  if (!w) return { error: 'FORBIDDEN' };

  const finishedAt = new Date();
  const durationSeconds = w.startedAt
    ? Math.max(0, Math.round((finishedAt.getTime() - w.startedAt.getTime()) / 1000))
    : null;

  if (w.status !== 'COMPLETED') {
    await db.workout.updateMany({
      where: { id: d.workoutId },
      data: {
        status: 'COMPLETED',
        finishedAt,
        durationSeconds,
        perceivedEffort: d.perceivedEffort ?? null,
        notes: d.notes || null,
      },
    });
    const { detectAndRecordPrs } = await import('./pr-detect');
    try {
      await detectAndRecordPrs(db, userId, d.workoutId, finishedAt);
    } catch {
      // La detección de PRs nunca bloquea el cierre del entrenamiento.
    }
    const { syncAchievements } = await import('@/features/gamification/sync');
    await syncAchievements(db, userId, profile.timezone);
  }

  revalidatePath('/training');
  revalidatePath('/training/history');
  revalidatePath('/dashboard');
  redirect(`/training/workouts/${d.workoutId}`);
}

export async function discardWorkout(raw: { id: string }): Promise<never | Result> {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const db = forUser(userId);
  await db.workout.deleteMany({ where: { id: parsed.data.id, status: { not: 'COMPLETED' } } });
  revalidatePath('/training');
  redirect('/training');
}

/**
 * Pone el cronómetro en marcha "ahora" al tocar EMPEZAR en la pantalla de
 * arranque. Sólo si la sesión está activa y todavía no se completó ninguna
 * serie (así no se pisa el tiempo de un entreno ya empezado). Best-effort.
 */
export async function restartWorkoutClock(raw: { id: string }): Promise<Result> {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const db = forUser(userId);

  const w = await db.workout.findFirst({
    where: { id: parsed.data.id, status: 'ACTIVE' },
    select: { exercises: { select: { sets: { where: { isCompleted: true }, select: { id: true } } } } },
  });
  if (!w) return { error: 'NOT_FOUND' };
  const anyDone = w.exercises.some((e) => e.sets.length > 0);
  if (anyDone) return { ok: true };

  await db.workout.updateMany({
    where: { id: parsed.data.id, status: 'ACTIVE' },
    data: { startedAt: new Date() },
  });
  return { ok: true };
}
