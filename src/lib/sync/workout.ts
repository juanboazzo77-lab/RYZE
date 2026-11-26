import { z } from 'zod';
import type { PlanExerciseRow, Training } from './data';

/**
 * Un entrenamiento hecho en la app. Mientras dura es un BORRADOR que vive sólo en el teléfono y se guarda con cada
 * cambio; al terminarlo se sube entero, de una sola vez (operación "workout.complete"). Así el servidor nunca tiene
 * un entrenamiento a medias, no importa cuándo se corte la señal.
 */

export const WORKOUT_OP = 'workout.complete';

const MAX_EXERCISES = 40;
const MAX_SETS = 30;

/** Los mismos topes que la web (`src/features/training/schema.ts`). */
export const draftSetSchema = z.object({
  id: z.string().uuid(),
  setNumber: z.number().int().min(1).max(50),
  weightKg: z.number().min(0).max(2000).nullable(),
  reps: z.number().int().min(0).max(1000).nullable(),
  durationSeconds: z.number().int().min(0).max(36000).nullable(),
  distanceMeters: z.number().min(0).max(200000).nullable(),
  rir: z.number().min(0).max(10).nullable(),
  isWarmup: z.boolean(),
  isCompleted: z.boolean(),
});

export const draftExerciseSchema = z.object({
  id: z.string().uuid(),
  exerciseId: z.string().uuid(),
  name: z.string().max(200),
  type: z.enum(['STRENGTH', 'CARDIO']),
  primaryMuscle: z.string().max(40),
  targetRepsMin: z.number().int().min(0).max(1000).nullable(),
  targetRepsMax: z.number().int().min(0).max(1000).nullable(),
  targetRir: z.number().min(0).max(10).nullable(),
  restSeconds: z.number().int().min(0).max(3600).nullable(),
  targetDurationSec: z.number().int().min(0).max(86400).nullable(),
  targetDistanceMeters: z.number().min(0).max(1_000_000).nullable(),
  notes: z.string().max(2000).nullable(),
  sets: z.array(draftSetSchema).max(MAX_SETS),
});

export const draftSchema = z.object({
  workoutId: z.string().uuid(),
  planDayId: z.string().uuid().nullable(),
  name: z.string().min(1).max(200),
  startedAt: z.string().datetime(),
  exercises: z.array(draftExerciseSchema).max(MAX_EXERCISES),
});

export const completedWorkoutSchema = draftSchema.extend({
  finishedAt: z.string().datetime(),
  perceivedEffort: z.number().int().min(1).max(10).nullable(),
});

export type DraftSet = z.infer<typeof draftSetSchema>;
export type DraftExercise = z.infer<typeof draftExerciseSchema>;
export type Draft = z.infer<typeof draftSchema>;
export type CompletedWorkout = z.infer<typeof completedWorkoutSchema>;

const emptySet = (id: string, setNumber: number): DraftSet => ({
  id, setNumber, weightKg: null, reps: null, durationSeconds: null, distanceMeters: null, rir: null, isWarmup: false, isCompleted: false,
});

/** Un entrenamiento nuevo a partir de un día de la rutina, igual que en la web: las series del plan, vacías. */
export function newDraft(
  day: { id: string; name: string; exercises: PlanExerciseRow[] },
  newId: () => string,
  now: Date,
): Draft {
  return {
    workoutId: newId(),
    planDayId: day.id,
    name: day.name,
    startedAt: now.toISOString(),
    exercises: day.exercises.slice(0, MAX_EXERCISES).map((e) => ({
      id: newId(),
      exerciseId: e.exerciseId,
      name: e.name,
      type: e.type,
      primaryMuscle: e.primaryMuscle,
      targetRepsMin: e.targetRepsMin,
      targetRepsMax: e.targetRepsMax,
      targetRir: e.targetRir,
      restSeconds: e.restSeconds,
      targetDurationSec: e.targetDurationSec,
      targetDistanceMeters: e.targetDistanceMeters,
      notes: e.notes,
      sets: Array.from({ length: Math.min(MAX_SETS, Math.max(1, e.targetSets)) }, (_, i) => emptySet(newId(), i + 1)),
    })),
  };
}

const mapExercise = (draft: Draft, exId: string, change: (e: DraftExercise) => DraftExercise): Draft => ({
  ...draft,
  exercises: draft.exercises.map((e) => (e.id === exId ? change(e) : e)),
});

/** Mantiene lo que se escribe dentro de los topes (un cero de más no puede dejar el entrenamiento sin poder subirse). */
function clampSet(s: DraftSet): DraftSet {
  const clamp = (v: number | null, max: number, whole = false) =>
    v === null || !Number.isFinite(v) ? null : Math.min(max, Math.max(0, whole ? Math.round(v) : v));
  return {
    ...s,
    weightKg: clamp(s.weightKg, 2000),
    reps: clamp(s.reps, 1000, true),
    durationSeconds: clamp(s.durationSeconds, 36000, true),
    distanceMeters: clamp(s.distanceMeters, 200000),
    rir: clamp(s.rir, 10),
  };
}

export const patchSet = (draft: Draft, exId: string, setId: string, patch: Partial<DraftSet>): Draft =>
  mapExercise(draft, exId, (e) => ({
    ...e,
    sets: e.sets.map((s) => (s.id === setId ? clampSet({ ...s, ...patch, id: s.id }) : s)),
  }));

/** Serie nueva al final, copiando lo de la anterior. */
export const addSet = (draft: Draft, exId: string, newId: () => string): Draft =>
  mapExercise(draft, exId, (e) => {
    if (e.sets.length >= MAX_SETS) return e;
    const prev = e.sets.at(-1);
    const next = prev ? { ...prev, id: newId(), setNumber: e.sets.length + 1, isWarmup: false, isCompleted: false } : emptySet(newId(), 1);
    return { ...e, sets: [...e.sets, next] };
  });

export const removeSet = (draft: Draft, exId: string, setId: string): Draft =>
  mapExercise(draft, exId, (e) => ({
    ...e,
    sets: e.sets.filter((s) => s.id !== setId).map((s, i) => ({ ...s, setNumber: i + 1 })),
  }));

export const removeExercise = (draft: Draft, exId: string): Draft => ({
  ...draft,
  exercises: draft.exercises.filter((e) => e.id !== exId),
});

export function progress(draft: Draft): { done: number; total: number } {
  const sets = draft.exercises.flatMap((e) => e.sets).filter((s) => !s.isWarmup);
  return { done: sets.filter((s) => s.isCompleted).length, total: sets.length };
}

/** Kilos totales movidos en las series completadas (sin calentamiento). */
export const volumeKg = (draft: Draft): number =>
  Math.round(
    draft.exercises
      .flatMap((e) => e.sets)
      .filter((s) => s.isCompleted && !s.isWarmup)
      .reduce((n, s) => n + (s.weightKg ?? 0) * (s.reps ?? 0), 0),
  );

export const finishDraft = (draft: Draft, perceivedEffort: number | null, now: Date): CompletedWorkout => ({
  ...draft,
  // Si el reloj del teléfono se atrasó durante el entreno, el final no puede quedar antes del comienzo.
  finishedAt: new Date(Math.max(now.getTime(), Date.parse(draft.startedAt))).toISOString(),
  perceivedEffort,
});

export type ExerciseHistory = NonNullable<Training['history']>[string];

/** Lo que cambia en los datos guardados al terminar un entrenamiento que todavía no subió: el día queda hecho y lo
 * cargado pasa a ser "la última vez" de cada ejercicio. */
export function applyCompleted(training: Training, workout: CompletedWorkout): Training {
  const recent = workout.planDayId
    ? [
        ...training.recentWorkouts.filter((w) => !(w.planDayId === workout.planDayId && w.finishedAt === workout.finishedAt)),
        { planDayId: workout.planDayId, finishedAt: workout.finishedAt },
      ]
    : training.recentWorkouts;

  const history = { ...(training.history ?? {}) };
  for (const e of workout.exercises) {
    const done = e.sets.filter((s) => s.isCompleted);
    if (done.length === 0) continue;
    const previous = history[e.exerciseId];
    const best = Math.max(0, ...done.filter((s) => !s.isWarmup).map((s) => s.weightKg ?? 0));
    history[e.exerciseId] = {
      lastTime: done.map((s) => ({ weightKg: s.weightKg, reps: s.reps })),
      bestWeightKg: best > (previous?.bestWeightKg ?? 0) ? best : (previous?.bestWeightKg ?? null),
    };
  }
  return { ...training, recentWorkouts: recent, history };
}
