import { z } from 'zod';

/** Ajuste sugerido para un ejercicio del plan activo. */
export const trainingAdjustmentSchema = z.object({
  exercise: z.string().min(1).max(80),
  action: z.enum(['increase_load', 'add_reps', 'add_set', 'hold', 'reduce']),
  detail: z.string().min(1).max(240),
});
export type TrainingAdjustment = z.infer<typeof trainingAdjustmentSchema>;

/** Progresión de entrenamiento sugerida por el Coach. */
export const trainingReviewSchema = z.object({
  /** progress = subir · hold = mantener otra semana · deload = semana de descarga */
  call: z.enum(['progress', 'hold', 'deload']),
  summary: z.string().min(5).max(700),
  adjustments: z.array(trainingAdjustmentSchema).max(12),
});
export type TrainingReview = z.infer<typeof trainingReviewSchema>;

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
  /** Análisis de las fotos de físico. Presente sólo si el usuario adjuntó fotos. */
  physiqueNote: z.string().max(900).optional(),
  /** Progresión de entrenamiento. Presente sólo si hubo entrenamientos en la semana. */
  training: trainingReviewSchema.optional(),
});
export type CheckinReview = z.infer<typeof checkinReviewSchema>;

/** Lo que se guarda en `weekly_checkin.ai_training_proposal`. */
export interface TrainingProposal extends TrainingReview {
  applied: boolean;
}

/** Lo que se guarda en `weekly_checkin.ai_proposal`. */
export interface CheckinProposal {
  kind: 'nutrition_targets' | 'none';
  rationale: string;
  /** Objetivo previo (para mostrar el "antes → después"). */
  from: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null;
  to: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null;
}
