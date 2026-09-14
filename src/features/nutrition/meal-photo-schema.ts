import { z } from 'zod';

/** Un alimento detectado en la foto. Macros para la porción estimada (`grams`). */
export const mealPhotoItemSchema = z.object({
  name: z.string().min(1).max(80),
  grams: z.number().min(1).max(3000),
  kcal: z.number().min(0).max(5000),
  proteinG: z.number().min(0).max(400),
  carbsG: z.number().min(0).max(600),
  fatG: z.number().min(0).max(300),
});
export type MealPhotoItem = z.infer<typeof mealPhotoItemSchema>;

/** Salida estructurada de "estimar comida desde foto". Plana para Gemini. */
export const mealPhotoEstimateSchema = z.object({
  title: z.string().min(1).max(80),
  items: z.array(mealPhotoItemSchema).min(1).max(12),
  confidence: z.enum(['low', 'medium', 'high']),
  note: z.string().max(400).optional(),
});
export type MealPhotoEstimate = z.infer<typeof mealPhotoEstimateSchema>;

export const estimateMealPhotoSchema = z.object({
  photo: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)
    .max(4_000_000),
  note: z.string().trim().max(300).optional(),
});

export const estimateMealTextSchema = z.object({
  description: z.string().trim().min(3).max(500),
});

export const addPhotoMealSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'MERIENDA', 'DINNER', 'SNACK']),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        grams: z.number().min(0).max(5000),
        kcal: z.number().min(0).max(20000),
        proteinG: z.number().min(0).max(2000),
        carbsG: z.number().min(0).max(3000),
        fatG: z.number().min(0).max(1500),
      }),
    )
    .min(1)
    .max(12),
});
export type AddPhotoMealInput = z.infer<typeof addPhotoMealSchema>;
