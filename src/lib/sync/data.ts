import { z } from 'zod';
import type { Reducer } from './engine';
import { applyCompleted, completedWorkoutSchema, WORKOUT_OP } from './workout';

/**
 * Los datos de la persona que la app guarda en el teléfono: la misma forma en el servidor (que los arma) y en la app
 * (que los muestra). Cada etapa suma lo que necesita.
 */

export const weightSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.number(),
  note: z.string().nullable(),
});

export const planExerciseSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  name: z.string(),
  type: z.enum(['STRENGTH', 'CARDIO']),
  primaryMuscle: z.string(),
  targetSets: z.number().int(),
  targetRepsMin: z.number().nullable(),
  targetRepsMax: z.number().nullable(),
  targetRir: z.number().nullable(),
  restSeconds: z.number().nullable(),
  targetDurationSec: z.number().nullable(),
  targetDistanceMeters: z.number().nullable(),
  notes: z.string().nullable(),
});

export const trainingSchema = z.object({
  /** La rutina activa, o null si no tiene. */
  plan: z
    .object({
      id: z.string(),
      name: z.string(),
      weekShift: z.number().int(),
      /** yyyy-mm-dd de la semana en la que se pidió correr los días. */
      weekShiftStart: z.string().nullable(),
      days: z.array(
        z.object({ id: z.string(), name: z.string(), weekday: z.number().int().nullable(), exercises: z.array(planExerciseSchema) }),
      ),
    })
    .nullable(),
  /** Entrenamientos terminados hace poco. Qué está "hecho esta semana" se calcula en el teléfono, así se reinicia solo
   * al empezar la semana siguiente aunque no haya señal. */
  recentWorkouts: z.array(z.object({ planDayId: z.string(), finishedAt: z.string() })),
  /** Por ejercicio de la rutina: lo que se hizo la última vez y el mejor peso. */
  history: z
    .record(
      z.object({
        lastTime: z.array(z.object({ weightKg: z.number().nullable(), reps: z.number().nullable() })),
        bestWeightKg: z.number().nullable(),
      }),
    )
    .optional(),
});

export const appDataSchema = z.object({
  profile: z.object({
    name: z.string().nullable(),
    email: z.string(),
    timezone: z.string(),
    unitSystem: z.enum(['METRIC', 'IMPERIAL']),
    weekStart: z.number().int(),
    locale: z.string(),
  }),
  /** Del más nuevo al más viejo. */
  weights: z.array(weightSchema),
  /** Falta en los datos guardados por versiones anteriores de la app, hasta que vuelven a sincronizar. */
  training: trainingSchema.optional(),
});

export type AppData = z.infer<typeof appDataSchema>;
export type Training = z.infer<typeof trainingSchema>;
export type TrainingPlan = NonNullable<Training['plan']>;
export type PlanExerciseRow = z.infer<typeof planExerciseSchema>;
export type WeightRow = AppData['weights'][number];

const weightPayload = z.object({ date: weightSchema.shape.date, weightKg: z.number(), note: z.string().optional() });

/** Cómo se ve cada cambio todavía sin subir. Aplicarlo dos veces da lo mismo. */
export const reducers: Record<string, Reducer> = {
  [WORKOUT_OP]: (data, op) => {
    const workout = completedWorkoutSchema.safeParse(op.payload);
    const training = trainingSchema.safeParse(data.training);
    if (!workout.success || !training.success) return data;
    return { ...data, training: applyCompleted(training.data, workout.data) };
  },
  'weight.log': (data, op) => {
    const p = weightPayload.safeParse(op.payload);
    if (!p.success) return data;
    const current = (data.weights as WeightRow[] | undefined) ?? [];
    const row: WeightRow = { date: p.data.date, weightKg: p.data.weightKg, note: p.data.note || null };
    const weights = [...current.filter((w) => w.date !== row.date), row].sort((a, b) => b.date.localeCompare(a.date));
    return { ...data, weights };
  },
};

/** Lo que se muestra: lo bajado del servidor con lo pendiente encima. Null si todavía no se bajó nada utilizable. */
export function readAppData(view: Record<string, unknown>): AppData | null {
  const parsed = appDataSchema.safeParse(view);
  return parsed.success ? parsed.data : null;
}

/** "78,4" o "78.4" → 78.4. Null si no es un número. */
export function parseDecimal(raw: string): number | null {
  const text = raw.trim().replace(',', '.');
  return /^\d{1,4}(\.\d{1,2})?$/.test(text) ? Number(text) : null;
}
