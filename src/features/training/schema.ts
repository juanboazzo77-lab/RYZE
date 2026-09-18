import { z } from 'zod';

const uuid = z.string().uuid();
const muscle = z.enum([
  'CHEST',
  'BACK',
  'SHOULDERS',
  'BICEPS',
  'TRICEPS',
  'FOREARMS',
  'QUADS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'ABS',
  'TRAPS',
  'FULL_BODY',
  'OTHER',
]);

export const createPlanSchema = z.object({ name: z.string().trim().min(2).max(60) });
export const updatePlanSchema = z.object({
  id: uuid,
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});
export const idSchema = z.object({ id: uuid });

export const addDaySchema = z.object({ planId: uuid, name: z.string().trim().min(1).max(40) });
export const updateDaySchema = z.object({
  id: uuid,
  name: z.string().trim().min(1).max(40).optional(),
  weekday: z.number().int().min(1).max(7).nullable().optional(),
});
export const reorderSchema = z.object({ ids: z.array(uuid).min(1).max(50) });

export const addPlanExerciseSchema = z.object({
  planDayId: uuid,
  exerciseId: uuid,
});
export const updatePlanExerciseSchema = z.object({
  id: uuid,
  targetSets: z.number().int().min(1).max(20).optional(),
  targetRepsMin: z.number().int().min(1).max(100).nullable().optional(),
  targetRepsMax: z.number().int().min(1).max(100).nullable().optional(),
  targetRir: z.number().min(0).max(10).nullable().optional(),
  restSeconds: z.number().int().min(0).max(1200).nullable().optional(),
  targetDurationSec: z.number().int().min(0).max(36000).nullable().optional(),
  targetDistanceMeters: z.number().min(0).max(200000).nullable().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
});

export const exerciseType = z.enum(['STRENGTH', 'CARDIO']);

export const createExerciseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: exerciseType.default('STRENGTH'),
  primaryMuscle: muscle,
  equipment: z.string().trim().max(40).optional(),
});

export const startWorkoutSchema = z.object({
  planDayId: uuid.nullable().optional(),
});

export const addWorkoutExerciseSchema = z.object({
  workoutId: uuid,
  exerciseId: uuid,
});

const setInput = z.object({
  /** uuid generado por el cliente; el server hace upsert por este id. */
  id: uuid,
  workoutExerciseId: uuid,
  setNumber: z.number().int().min(1).max(50),
  weightKg: z.number().min(0).max(2000).nullable(),
  reps: z.number().int().min(0).max(1000).nullable(),
  durationSeconds: z.number().int().min(0).max(36000).nullable(),
  distanceMeters: z.number().min(0).max(200000).nullable(),
  rir: z.number().min(0).max(10).nullable(),
  isWarmup: z.boolean(),
  isCompleted: z.boolean(),
});

export const saveWorkoutSchema = z.object({
  workoutId: uuid,
  sets: z.array(setInput).max(400),
  deletedSetIds: z.array(uuid).max(200).optional(),
});

export const finishWorkoutSchema = z.object({
  workoutId: uuid,
  perceivedEffort: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().trim().max(500).optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type AddDayInput = z.infer<typeof addDaySchema>;
export type UpdateDayInput = z.infer<typeof updateDaySchema>;
export type AddPlanExerciseInput = z.infer<typeof addPlanExerciseSchema>;
export type UpdatePlanExerciseInput = z.infer<typeof updatePlanExerciseSchema>;
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type StartWorkoutInput = z.infer<typeof startWorkoutSchema>;
export type AddWorkoutExerciseInput = z.infer<typeof addWorkoutExerciseSchema>;
export type SaveWorkoutInput = z.infer<typeof saveWorkoutSchema>;
export type FinishWorkoutInput = z.infer<typeof finishWorkoutSchema>;
