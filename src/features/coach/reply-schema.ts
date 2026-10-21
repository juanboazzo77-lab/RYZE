import { z } from 'zod';

/** Alimento que el coach identificó en la pregunta, con valores por 100 g. */
export const coachFoodSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kcalPer100: z.number().min(0).max(1000),
  proteinPer100: z.number().min(0).max(100),
  carbsPer100: z.number().min(0).max(100),
  fatPer100: z.number().min(0).max(100),
  /** Porción típica en gramos para proponerle al usuario. */
  suggestedGrams: z.number().min(1).max(2000),
});
export type CoachFood = z.infer<typeof coachFoodSchema>;

/** Respuesta del chat: el texto y, si preguntó por un alimento concreto, el alimento. */
export const coachReplySchema = z.object({
  reply: z.string().min(1),
  food: coachFoodSchema.nullable().catch(null),
});
export type CoachReply = z.infer<typeof coachReplySchema>;
