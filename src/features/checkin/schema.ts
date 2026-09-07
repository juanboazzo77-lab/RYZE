import { z } from 'zod';

/** Respuesta estructurada de la revisión semanal del AI Coach. Plana para Gemini. */
export const checkinReviewSchema = z.object({
  summary: z.string().min(10).max(1000),
  /** ¿Recomienda cambiar los objetivos nutricionales esta semana? */
  adjust: z.boolean(),
  kcal: z.number().int().min(1000).max(6000),
  proteinG: z.number().int().min(40).max(400),
  carbsG: z.number().int().min(0).max(900),
  fatG: z.number().int().min(15).max(300),
  rationale: z.string().min(5).max(600),
});
export type CheckinReview = z.infer<typeof checkinReviewSchema>;

/** Lo que se guarda en `weekly_checkin.ai_proposal`. */
export interface CheckinProposal {
  kind: 'nutrition_targets' | 'none';
  rationale: string;
  /** Objetivo previo (para mostrar el "antes → después"). */
  from: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null;
  to: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null;
}

export const weekActionSchema = z.object({ weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
export type WeekActionInput = z.infer<typeof weekActionSchema>;
