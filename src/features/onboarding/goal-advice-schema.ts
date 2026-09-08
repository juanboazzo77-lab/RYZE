import { z } from 'zod';

/**
 * Recomendación del Coach para un usuario que eligió objetivo "indeciso".
 * Plana para Gemini.
 */
export const goalAdviceSchema = z.object({
  /** Objetivo concreto sugerido. */
  recommendedGoal: z.enum(['LOSE_FAT', 'GAIN_MUSCLE', 'RECOMP']),
  /** Por qué ese objetivo, en 2-4 frases, hablándole al usuario. */
  reasoning: z.string().min(10).max(700),
  /** Qué mejorar / priorizar (grupos musculares rezagados, postura, etc.). */
  improvements: z.string().min(5).max(700),
});
export type GoalAdvice = z.infer<typeof goalAdviceSchema>;
