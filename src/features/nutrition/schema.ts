import { z } from 'zod';

const dateISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const mealType = z.enum(['BREAKFAST', 'LUNCH', 'MERIENDA', 'DINNER', 'SNACK']);
const qty = z.number().positive().max(100000);
const unit = z.string().min(1).max(20);
const macro = z.number().min(0).max(100000);

export const addEntrySchema = z
  .object({
    date: dateISO,
    mealType,
    foodId: z.string().uuid().nullable().optional(),
    customName: z.string().trim().min(1).max(120).nullable().optional(),
    quantity: qty,
    unit,
    /** Sólo para alta manual (sin foodId): macros ingresadas por el usuario. */
    manualMacros: z
      .object({ kcal: macro, proteinG: macro, carbsG: macro, fatG: macro })
      .optional(),
  })
  .refine((v) => v.foodId || v.customName, { message: 'foodId o customName requerido' });
export type AddEntryInput = z.infer<typeof addEntrySchema>;

export const updateEntrySchema = z.object({
  id: z.string().uuid(),
  quantity: qty.optional(),
  unit: unit.optional(),
  mealType: mealType.optional(),
  customName: z.string().trim().min(1).max(120).optional(),
  macros: z.object({ kcal: macro, proteinG: macro, carbsG: macro, fatG: macro }).optional(),
});
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;

export const idSchema = z.object({ id: z.string().uuid() });

/** EAN-8 / UPC-A (12) / EAN-13 / ITF-14: sólo dígitos, 8 a 14. */
export const barcodeSchema = z
  .string()
  .trim()
  .regex(/^\d{8,14}$/);

export const createFoodSchema = z.object({
  name: z.string().trim().min(2).max(120),
  brand: z.string().trim().max(80).optional(),
  kcalPer100: macro,
  proteinPer100: macro,
  carbsPer100: macro,
  fatPer100: macro,
  servingQty: z.number().positive().max(5000).nullable().optional(),
  servingLabel: z.string().trim().max(40).nullable().optional(),
});
export type CreateFoodInput = z.infer<typeof createFoodSchema>;

export const saveMealSchema = z.object({
  date: dateISO,
  mealType,
  name: z.string().trim().min(2).max(80),
});
export type SaveMealInput = z.infer<typeof saveMealSchema>;

export const addMealToDaySchema = z.object({
  mealId: z.string().uuid(),
  date: dateISO,
  mealType,
});
export type AddMealToDayInput = z.infer<typeof addMealToDaySchema>;

export const copyDaySchema = z.object({
  fromDate: dateISO,
  toDate: dateISO,
  mealTypes: z.array(mealType).min(1).optional(),
});
export type CopyDayInput = z.infer<typeof copyDaySchema>;
