import { z } from 'zod';
import { computeEntryMacros, sumMacros, type FoodLike, type MacroTotals } from '@/lib/nutrition/food-math';

/**
 * La alimentación sin conexión: lo que la app guarda, lo que sube y cómo se ve cada cambio todavía sin subir. La usan
 * la app y el servidor.
 */

export const MEALS = ['BREAKFAST', 'LUNCH', 'MERIENDA', 'DINNER', 'SNACK'] as const;
export const mealTypeSchema = z.enum(MEALS);
export type Meal = z.infer<typeof mealTypeSchema>;

/** Cuántos días de comidas se bajan al teléfono, contando hoy. */
export const NUTRITION_DAYS = 60;
/** Tope de la biblioteca que se baja entera para poder buscar sin señal. */
export const MAX_FOODS = 4000;
/** Alimentos que se pueden anotar en un solo cambio. */
export const MAX_ITEMS = 50;

export const FOOD_ADD_OP = 'food.add';
export const FOOD_UPDATE_OP = 'food.update';
export const FOOD_DELETE_OP = 'food.delete';

const dateISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const macroShape = { kcal: z.number(), proteinG: z.number(), carbsG: z.number(), fatG: z.number() };

export const libraryFoodSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  kcalPer100: z.number(),
  proteinPer100: z.number(),
  carbsPer100: z.number(),
  fatPer100: z.number(),
  servingQty: z.number().nullable(),
  servingLabel: z.string().nullable(),
  verified: z.boolean(),
});
export type LibraryFood = z.infer<typeof libraryFoodSchema>;

export const entryRowSchema = z.object({
  id: z.string(),
  date: dateISO,
  mealType: mealTypeSchema,
  foodId: z.string().nullable(),
  /** El nombre puesto a mano; si es null el nombre es el del alimento. */
  customName: z.string().nullable(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  ...macroShape,
  isEstimated: z.boolean(),
  position: z.number(),
});
export type EntryRowData = z.infer<typeof entryRowSchema>;

export const savedMealSchema = z.object({
  id: z.string(),
  name: z.string(),
  items: z.array(
    z.object({ foodId: z.string().nullable(), customName: z.string().nullable(), name: z.string(), quantity: z.number(), unit: z.string(), ...macroShape }),
  ),
});
export type SavedMeal = z.infer<typeof savedMealSchema>;

export const nutritionSchema = z.object({
  /** El primer día del que se bajaron las comidas: de antes no se sabe qué hubo. */
  since: dateISO,
  target: z.object(macroShape).nullable(),
  entries: z.array(entryRowSchema),
  foods: z.array(libraryFoodSchema),
  meals: z.array(savedMealSchema),
});
export type Nutrition = z.infer<typeof nutritionSchema>;

/* ---------------- Lo que se sube ---------------- */

const amount = z.number().min(0).max(100000);
const quantity = z.number().positive().max(100000);
const unit = z.string().min(1).max(20);

export const addItemSchema = z
  .object({
    id: z.string().uuid(),
    mealType: mealTypeSchema,
    foodId: z.string().uuid().nullable(),
    customName: z.string().min(1).max(200).nullable(),
    /** Para mostrarlo sin señal, y como nombre si el alimento ya no existe cuando se sube. */
    name: z.string().min(1).max(200),
    quantity,
    unit,
    kcal: amount,
    proteinG: amount,
    carbsG: amount,
    fatG: amount,
    isEstimated: z.boolean(),
    /** De dónde salió. Con "food" el servidor vuelve a calcular los valores con la biblioteca. */
    kind: z.enum(['food', 'manual', 'meal', 'copy', 'duplicate', 'ai']),
  })
  .refine((v) => v.foodId || v.customName, { message: 'foodId o customName requerido' });
export type AddItem = z.infer<typeof addItemSchema>;

export const foodAddSchema = z.object({ date: dateISO, items: z.array(addItemSchema).min(1).max(MAX_ITEMS) });
export type FoodAdd = z.infer<typeof foodAddSchema>;

export const foodUpdateSchema = z
  .object({ entryId: z.string().uuid(), quantity: quantity.optional(), unit: unit.optional(), mealType: mealTypeSchema.optional() })
  .refine((v) => v.quantity !== undefined || v.unit !== undefined || v.mealType !== undefined, { message: 'sin cambios' });
export type FoodUpdate = z.infer<typeof foodUpdateSchema>;

export const foodDeleteSchema = z.object({ entryId: z.string().uuid() });

/**
 * Lo que cambia al editar una entrada, igual que en la web: los valores sólo se vuelven a calcular si la entrada es de
 * un alimento de la biblioteca y cambió la cantidad o la unidad.
 */
export function editedValues(
  entry: { quantity: number; unit: string },
  change: { quantity?: number; unit?: string },
  food: FoodLike | null,
) {
  const next = { quantity: change.quantity ?? entry.quantity, unit: change.unit ?? entry.unit };
  const moved = next.quantity !== entry.quantity || next.unit !== entry.unit;
  return food && moved ? { ...next, ...computeEntryMacros(food, next.quantity, next.unit) } : next;
}

/* ---------------- Cómo se ve lo pendiente ---------------- */

const nextPosition = (entries: EntryRowData[], date: string, meal: Meal) =>
  entries.reduce((max, e) => (e.date === date && e.mealType === meal ? Math.max(max, e.position + 1) : max), 0);

/** Aplicar dos veces el mismo cambio da lo mismo. Un cambio que no se entiende deja todo como estaba. */
export function applyFoodOp(nutrition: Nutrition, type: string, payload: unknown): Nutrition {
  if (type === FOOD_ADD_OP) {
    const p = foodAddSchema.safeParse(payload);
    if (!p.success) return nutrition;
    const entries = [...nutrition.entries];
    const have = new Set(entries.map((e) => e.id));
    for (const { kind: _kind, ...item } of p.data.items) {
      if (have.has(item.id)) continue;
      have.add(item.id);
      entries.push({ ...item, date: p.data.date, position: nextPosition(entries, p.data.date, item.mealType) });
    }
    return { ...nutrition, entries };
  }
  if (type === FOOD_UPDATE_OP) {
    const p = foodUpdateSchema.safeParse(payload);
    if (!p.success) return nutrition;
    const current = nutrition.entries.find((e) => e.id === p.data.entryId);
    if (!current) return nutrition;
    const food = current.foodId ? (nutrition.foods.find((f) => f.id === current.foodId) ?? null) : null;
    const mealType = p.data.mealType ?? current.mealType;
    const updated: EntryRowData = {
      ...current,
      ...editedValues(current, p.data, food),
      mealType,
      position: mealType === current.mealType ? current.position : nextPosition(nutrition.entries, current.date, mealType),
    };
    return { ...nutrition, entries: nutrition.entries.map((e) => (e.id === current.id ? updated : e)) };
  }
  if (type === FOOD_DELETE_OP) {
    const p = foodDeleteSchema.safeParse(payload);
    if (!p.success) return nutrition;
    return { ...nutrition, entries: nutrition.entries.filter((e) => e.id !== p.data.entryId) };
  }
  return nutrition;
}

/* ---------------- Lo que muestra la pantalla ---------------- */

/** Una entrada con todo lo que necesita su fila y su panel de detalle. */
export interface EntryView extends MacroTotals {
  id: string;
  mealType: Meal;
  foodId: string | null;
  name: string;
  quantity: number;
  unit: string;
  isEstimated: boolean;
  brand: string | null;
  per100: MacroTotals | null;
}

export interface DayData {
  dateISO: string;
  target: MacroTotals | null;
  meals: Record<Meal, EntryView[]>;
  mealTotals: Record<Meal, MacroTotals>;
  totals: MacroTotals;
}

const one = (n: number) => Math.round(n * 10) / 10;

export function dayData(nutrition: Nutrition, dateISO: string): DayData {
  const foods = new Map(nutrition.foods.map((f) => [f.id, f]));
  const meals: Record<Meal, EntryView[]> = { BREAKFAST: [], LUNCH: [], MERIENDA: [], DINNER: [], SNACK: [] };
  const rows = nutrition.entries.filter((e) => e.date === dateISO).sort((a, b) => a.position - b.position);
  for (const e of rows) {
    const food = e.foodId ? foods.get(e.foodId) : undefined;
    meals[e.mealType].push({
      id: e.id,
      mealType: e.mealType,
      foodId: e.foodId,
      name: e.name,
      quantity: e.quantity,
      unit: e.unit,
      kcal: Math.round(e.kcal),
      proteinG: one(e.proteinG),
      carbsG: one(e.carbsG),
      fatG: one(e.fatG),
      isEstimated: e.isEstimated,
      brand: food?.brand ?? null,
      per100: food
        ? { kcal: Math.round(food.kcalPer100), proteinG: one(food.proteinPer100), carbsG: one(food.carbsPer100), fatG: one(food.fatPer100) }
        : null,
    });
  }
  const mealTotals = {} as Record<Meal, MacroTotals>;
  for (const m of MEALS) mealTotals[m] = sumMacros(meals[m]);
  return { dateISO, target: nutrition.target, meals, mealTotals, totals: sumMacros(MEALS.map((m) => mealTotals[m])) };
}

export interface RecentFood {
  key: string;
  /** Cómo se anotó la última vez. */
  last: EntryRowData;
  times: number;
}

/** Lo que la persona anotó hace poco, sin repetidos, de lo más nuevo a lo más viejo. */
export function recentFoods(entries: EntryRowData[], limit = 30): RecentFood[] {
  const found = new Map<string, RecentFood>();
  const newestFirst = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.position - a.position);
  for (const e of newestFirst) {
    const key = e.foodId ?? `n:${e.name.trim().toLowerCase()}`;
    const seen = found.get(key);
    if (seen) seen.times += 1;
    else found.set(key, { key, last: e, times: 1 });
  }
  return [...found.values()].slice(0, limit);
}

/* ---------------- Armar lo que se va a anotar ---------------- */

export function itemFromFood(food: LibraryFood, mealType: Meal, amountOf: number, unitOf: string, id: string): AddItem {
  return {
    id,
    mealType,
    foodId: food.id,
    customName: null,
    name: food.name,
    quantity: amountOf,
    unit: unitOf,
    ...computeEntryMacros(food, amountOf, unitOf),
    kind: 'food',
  };
}

type Copyable = Pick<EntryRowData, 'foodId' | 'customName' | 'name' | 'quantity' | 'unit' | 'kcal' | 'proteinG' | 'carbsG' | 'fatG'>;

/** Una copia exacta de algo ya anotado: mismos valores, aunque estén corregidos a mano o estimados. */
export function itemFromEntry(entry: Copyable, mealType: Meal, kind: 'meal' | 'copy' | 'duplicate', isEstimated: boolean, id: string): AddItem {
  const { foodId, name, kcal, proteinG, carbsG, fatG } = entry;
  return {
    id,
    mealType,
    foodId,
    customName: entry.customName ?? (foodId ? null : name),
    name,
    quantity: entry.quantity,
    unit: entry.unit,
    kcal,
    proteinG,
    carbsG,
    fatG,
    isEstimated,
    kind,
  };
}

/** Algo que estimó la IA (foto o descripción), con los mismos redondeos que usa la web. */
export function itemFromEstimate(
  item: { name: string; grams: number } & MacroTotals,
  mealType: Meal,
  id: string,
): AddItem {
  return {
    id,
    mealType,
    foodId: null,
    customName: item.name,
    name: item.name,
    quantity: Math.max(1, Math.round(item.grams)),
    unit: 'g',
    kcal: Math.round(item.kcal),
    proteinG: one(item.proteinG),
    carbsG: one(item.carbsG),
    fatG: one(item.fatG),
    isEstimated: true,
    kind: 'ai',
  };
}

export function itemFromManual(name: string, macros: MacroTotals, mealType: Meal, servingUnit: string, id: string): AddItem {
  return { id, mealType, foodId: null, customName: name, name, quantity: 1, unit: servingUnit, ...macros, isEstimated: true, kind: 'manual' };
}
