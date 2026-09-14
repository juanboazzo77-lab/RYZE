import { z } from 'zod';

/** Un alimento dentro de una comida del plan. Macros para toda la porción indicada. */
export const mealPlanItemSchema = z.object({
  name: z.string().min(1).max(80),
  grams: z.number().min(1).max(2000),
  kcal: z.number().min(0).max(5000),
  proteinG: z.number().min(0).max(400),
  carbsG: z.number().min(0).max(600),
  fatG: z.number().min(0).max(300),
  /** Medida casera equivalente ("1 taza", "2 puños") para quien no pesa la comida. */
  householdMeasure: z.string().trim().max(60).optional(),
});
export type MealPlanItem = z.infer<typeof mealPlanItemSchema>;

export const mealPlanMealSchema = z.object({
  type: z.enum(['BREAKFAST', 'LUNCH', 'MERIENDA', 'DINNER', 'SNACK']),
  title: z.string().min(1).max(80),
  items: z.array(mealPlanItemSchema).min(1).max(8),
});
export type MealPlanMeal = z.infer<typeof mealPlanMealSchema>;

/** Salida estructurada de "planificá mi día con IA". Plana para Gemini. */
export const mealPlanSchema = z.object({
  meals: z.array(mealPlanMealSchema).min(1).max(6),
  notes: z.string().max(500).optional(),
  shoppingList: z.array(z.string().min(1).max(80)).max(40),
});
export type MealPlan = z.infer<typeof mealPlanSchema>;

export const generateMealPlanSchema = z.object({ brief: z.string().trim().max(400) });
export const addMealPlanSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meals: z.array(mealPlanMealSchema).min(1).max(6),
});
export type AddMealPlanInput = z.infer<typeof addMealPlanSchema>;
