import { z } from 'zod';

export const sendMessageSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const generatePlanSchema = z.object({
  brief: z.string().trim().max(600),
});
export type GeneratePlanInput = z.infer<typeof generatePlanSchema>;

export const acceptPlanSchema = z.object({
  generationId: z.string().uuid(),
  /** El usuario puede haber editado el borrador antes de aceptar. */
  overrides: z
    .object({
      name: z.string().trim().min(3).max(60).optional(),
      applyNutrition: z.boolean().optional(),
    })
    .optional(),
});
export type AcceptPlanInput = z.infer<typeof acceptPlanSchema>;
