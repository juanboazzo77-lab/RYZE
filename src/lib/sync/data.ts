import { DateTime } from 'luxon';
import { z } from 'zod';
import type { Reducer } from './engine';
import { accessSchema, achievementSchema, activityDaySchema, addToStats, applyActivityOp, dayOnlySchema, statsDataSchema, weightGoalSchema, ACTIVITY_DELETE_OP, ACTIVITY_LOG_OP, WEIGHT_DELETE_OP } from './progress';
import { applyFoodOp, FOOD_ADD_OP, FOOD_DELETE_OP, FOOD_UPDATE_OP, nutritionSchema } from './nutrition';
import { applyCompleted, completedWorkoutSchema, WORKOUT_OP, type CompletedWorkout } from './workout';

/**
 * Los datos de la persona que la app guarda en el teléfono: la misma forma en el servidor (que los arma) y en la app
 * (que los muestra). Cada etapa suma lo que necesita.
 */

const dateISOSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

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

/** Un entrenamiento ya terminado, como lo muestra el historial. */
export const pastWorkoutSchema = z.object({
  id: z.string(),
  name: z.string(),
  finishedAt: z.string(),
  durationSeconds: z.number().nullable(),
  perceivedEffort: z.number().nullable(),
  /** Récords que se lograron en ese entrenamiento (los calcula el servidor al recibirlo). */
  records: z.array(z.object({ exerciseId: z.string(), type: z.enum(['MAX_WEIGHT', 'MAX_REPS', 'MAX_VOLUME', 'EST_1RM']) })),
  exercises: z.array(
    z.object({
      id: z.string(),
      exerciseId: z.string(),
      name: z.string(),
      type: z.enum(['STRENGTH', 'CARDIO']),
      sets: z.array(
        z.object({
          setNumber: z.number(),
          weightKg: z.number().nullable(),
          reps: z.number().nullable(),
          durationSeconds: z.number().nullable(),
          distanceMeters: z.number().nullable(),
          isWarmup: z.boolean(),
          isCompleted: z.boolean(),
        }),
      ),
    }),
  ),
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
  /** Los últimos entrenamientos, del más nuevo al más viejo. */
  past: z.array(pastWorkoutSchema).optional(),
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
  nutrition: nutritionSchema.optional(),
  /** El peso de partida y el objetivo, si tiene. */
  goal: weightGoalSchema.nullable().optional(),
  /** Pasos de los últimos días, del más viejo al más nuevo. */
  activity: z.array(activityDaySchema).optional(),
  access: accessSchema.optional(),
  stats: statsDataSchema.optional(),
  /** Todos los días (en la zona de la persona) en que terminó al menos un entrenamiento. */
  trainedDays: z.array(dateISOSchema).optional(),
  /** Los calcula el servidor: sin señal se ven como quedaron la última vez. */
  achievements: z.array(achievementSchema).optional(),
});

export type AppData = z.infer<typeof appDataSchema>;
export type Training = z.infer<typeof trainingSchema>;
export type TrainingPlan = NonNullable<Training['plan']>;
export type PastWorkout = z.infer<typeof pastWorkoutSchema>;
export type PlanExerciseRow = z.infer<typeof planExerciseSchema>;
export type WeightRow = AppData['weights'][number];

const weightPayload = z.object({ date: weightSchema.shape.date, weightKg: z.number(), note: z.string().optional() });

const foodReducer: Reducer = (data, op) => {
  const nutrition = nutritionSchema.safeParse(data.nutrition);
  return nutrition.success ? { ...data, nutrition: applyFoodOp(nutrition.data, op.type, op.payload) } : data;
};

/** El entrenamiento recién terminado también cuenta en las estadísticas y en el calendario de constancia. */
function withHistory(data: Record<string, unknown>, workout: CompletedWorkout): Record<string, unknown> {
  const out = { ...data };
  const stats = statsDataSchema.safeParse(data.stats);
  if (stats.success) out.stats = addToStats(stats.data, workout);
  const days = z.array(dateISOSchema).safeParse(data.trainedDays);
  const timezone = (data.profile as { timezone?: string } | undefined)?.timezone;
  if (days.success && timezone) {
    const day = DateTime.fromISO(workout.finishedAt).setZone(timezone).toISODate();
    if (day && !days.data.includes(day)) out.trainedDays = [...days.data, day];
  }
  return out;
}

/** Idioma y unidades cambiados desde la app. */
export const PREFS_OP = 'prefs.update';
export const prefsSchema = z
  .object({ locale: z.enum(['ES', 'EN', 'PT', 'FR', 'DE', 'IT']).optional(), unitSystem: z.enum(['METRIC', 'IMPERIAL']).optional() })
  .refine((v) => v.locale || v.unitSystem, { message: 'sin cambios' });

const activityReducer: Reducer = (data, op) => {
  const days = z.array(activityDaySchema).safeParse(data.activity);
  return days.success ? { ...data, activity: applyActivityOp(days.data, op.type, op.payload) } : data;
};

/** Cómo se ve cada cambio todavía sin subir. Aplicarlo dos veces da lo mismo. */
export const reducers: Record<string, Reducer> = {
  [PREFS_OP]: (data, op) => {
    const p = prefsSchema.safeParse(op.payload);
    return p.success && data.profile ? { ...data, profile: { ...(data.profile as object), ...p.data } } : data;
  },
  [ACTIVITY_LOG_OP]: activityReducer,
  [ACTIVITY_DELETE_OP]: activityReducer,
  [WEIGHT_DELETE_OP]: (data, op) => {
    const p = dayOnlySchema.safeParse(op.payload);
    if (!p.success) return data;
    return { ...data, weights: ((data.weights as WeightRow[] | undefined) ?? []).filter((w) => w.date !== p.data.date) };
  },
  [FOOD_ADD_OP]: foodReducer,
  [FOOD_UPDATE_OP]: foodReducer,
  [FOOD_DELETE_OP]: foodReducer,
  [WORKOUT_OP]: (data, op) => {
    const workout = completedWorkoutSchema.safeParse(op.payload);
    const training = trainingSchema.safeParse(data.training);
    if (!workout.success || !training.success) return data;
    return withHistory({ ...data, training: applyCompleted(training.data, workout.data) }, workout.data);
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
