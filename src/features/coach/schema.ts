import { z } from 'zod';
import { PLAN_STYLES } from './plan-styles';

export const sendMessageSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const generatePlanSchema = z.object({
  brief: z.string().trim().max(600),
  /** Días por semana que el usuario eligió entrenar para este plan. */
  days: z.number().int().min(1).max(7).optional(),
  /** Tipo de rutina elegido. */
  style: z.enum(PLAN_STYLES).optional(),
  /** Ejercicios que el usuario marcó como "no puedo hacerlo" (p. ej. no tiene la máquina). */
  excluded: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
});
export type GeneratePlanInput = z.infer<typeof generatePlanSchema>;

export const acceptPlanSchema = z.object({
  generationId: z.string().uuid(),
  /** El usuario puede haber editado el borrador antes de aceptar. */
  overrides: z
    .object({
      name: z.string().trim().min(3).max(60).optional(),
      applyNutrition: z.boolean().optional(),
      /** Ejercicios marcados "no puedo": clave `${indiceDia}:${indiceEjercicio}`. */
      skip: z.array(z.string().regex(/^\d{1,2}:\d{1,2}$/)).max(80).optional(),
      /** Alternativa elegida en lugar del ejercicio propuesto: clave `dia:ejercicio` → nombre. */
      swap: z.record(z.string().regex(/^\d{1,2}:\d{1,2}$/), z.string().min(2).max(80)).optional(),
    })
    .optional(),
});
export type AcceptPlanInput = z.infer<typeof acceptPlanSchema>;
