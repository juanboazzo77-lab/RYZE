import { z } from 'zod';
import type { ActivityDay } from '@/lib/activity/view';

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
