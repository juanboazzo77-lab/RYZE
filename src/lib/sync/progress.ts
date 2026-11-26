import { z } from 'zod';
import type { ActivityDay } from '@/lib/activity/view';
import { sessionVolume } from '@/lib/training/progress';
import type { CompletedWorkout } from './workout';

/**
 * El progreso sin conexión: pasos diarios y borrar un peso (cargarlo es `weight.log`, en `data.ts`). Lo usan la app y
 * el servidor. Hay un registro por fecha, así que la fecha alcanza para identificarlo.
 */

export const WEIGHT_DELETE_OP = 'weight.delete';
export const ACTIVITY_LOG_OP = 'activity.log';
export const ACTIVITY_DELETE_OP = 'activity.delete';

/** Cuántos días de pasos se bajan: los que muestra la pantalla. */
export const ACTIVITY_DAYS = 30;

const dateISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const activityDaySchema = z.object({ date: dateISO, steps: z.number(), activeMinutes: z.number().nullable() });
export const weightGoalSchema = z.object({ startWeightKg: z.number().nullable(), targetWeightKg: z.number().nullable() });

export const dayOnlySchema = z.object({ date: dateISO });
export const activityLogSchema = z.object({
  date: dateISO,
  steps: z.number().int().min(0).max(120000),
  activeMinutes: z.number().int().min(0).max(1440).nullable().optional(),
});

/* ---------------- Estadísticas, constancia y logros ---------------- */

/** Lo que hace falta de cada entrenamiento de las últimas semanas para las estadísticas. */
export const statsDataSchema = z.object({
  workouts: z.array(z.object({ id: z.string(), finishedAt: z.string(), volume: z.number() })),
  records: z.array(
    z.object({
      id: z.string(),
      exerciseName: z.string(),
      type: z.enum(['MAX_WEIGHT', 'MAX_REPS', 'MAX_VOLUME', 'EST_1RM']),
      value: z.number(),
      unit: z.string(),
      achievedAt: z.string(),
    }),
  ),
});
export type StatsData = z.infer<typeof statsDataSchema>;

export const achievementSchema = z.object({
  key: z.string(),
  category: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string().nullable(),
  threshold: z.number().nullable(),
  progress: z.number(),
  unlockedAt: z.string().nullable(),
});
export type AchievementRow = z.infer<typeof achievementSchema>;

/** Qué incluye el plan. Lo decide el servidor; `until` es cuando se termina la prueba gratis, si viene de ahí. */
export const accessSchema = z.object({ advancedStats: z.boolean(), until: z.string().nullable() });

export function hasStats(access: z.infer<typeof accessSchema> | undefined, now: Date): boolean {
  return Boolean(access?.advancedStats && (!access.until || now.getTime() < Date.parse(access.until)));
}

/** Un entrenamiento terminado sin señal cuenta enseguida en las estadísticas. */
export function addToStats(stats: StatsData, w: CompletedWorkout): StatsData {
  if (stats.workouts.some((x) => x.id === w.workoutId)) return stats;
  const volume = sessionVolume(w.exercises.flatMap((e) => e.sets));
  return { ...stats, workouts: [...stats.workouts, { id: w.workoutId, finishedAt: w.finishedAt, volume }] };
}

/* ---------------- Pasos ---------------- */

/** Aplicar dos veces el mismo cambio da lo mismo. */
export function applyActivityOp(days: ActivityDay[], type: string, payload: unknown): ActivityDay[] {
  if (type === ACTIVITY_LOG_OP) {
    const p = activityLogSchema.safeParse(payload);
    if (!p.success) return days;
    const row = { date: p.data.date, steps: p.data.steps, activeMinutes: p.data.activeMinutes ?? null };
    return [...days.filter((d) => d.date !== row.date), row].sort((a, b) => a.date.localeCompare(b.date));
  }
  if (type === ACTIVITY_DELETE_OP) {
    const p = dayOnlySchema.safeParse(payload);
    return p.success ? days.filter((d) => d.date !== p.data.date) : days;
  }
  return days;
}
