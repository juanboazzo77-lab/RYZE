import { z } from 'zod';

/**
 * Forma del plan de entrenamiento que devuelve la IA. Deliberadamente plano
 * (sin uniones ni refinamientos) para que Gemini lo respete como JSON Schema.
 * El servidor resuelve `name` → ejercicio de la biblioteca al aceptar.
 */

export const planDraftExercise = z.object({
  name: z.string().min(2).max(80),
  sets: z.number().int().min(1).max(10),
  repsMin: z.number().int().min(1).max(50),
  repsMax: z.number().int().min(1).max(50),
  rir: z.number().int().min(0).max(5),
  restSeconds: z.number().int().min(15).max(600),
});

export const planDraftDay = z.object({
  name: z.string().min(2).max(40),
  weekday: z.number().int().min(1).max(7),
  exercises: z.array(planDraftExercise).min(3).max(8),
});

export const planDraftSchema = z.object({
  name: z.string().min(3).max(60),
  description: z.string().min(3).max(300),
  weeklyNote: z.string().max(300),
  days: z.array(planDraftDay).min(1).max(7),
});

export type PlanDraft = z.infer<typeof planDraftSchema>;
export type PlanDraftDay = z.infer<typeof planDraftDay>;
export type PlanDraftExercise = z.infer<typeof planDraftExercise>;

/** Objetivos nutricionales calculados (deterministas, no IA) para el borrador. */
export interface NutritionDraft {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  adjustmentPct: number;
}
