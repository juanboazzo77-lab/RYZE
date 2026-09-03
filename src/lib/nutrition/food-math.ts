/**
 * Cálculo de macros de un alimento según cantidad y unidad. Función pura,
 * testeada. Los valores de la biblioteca (`food`) están por 100 g/ml.
 */

export const MEASURE_UNITS = ['g', 'ml', 'porción', 'unidad', 'taza', 'cda', 'cdta'] as const;
export type MeasureUnit = (typeof MEASURE_UNITS)[number];

export function isMeasureUnit(v: string): v is MeasureUnit {
  return (MEASURE_UNITS as readonly string[]).includes(v);
}

export interface FoodLike {
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  /** Gramos/ml de una "porción" / "unidad" de referencia. */
  servingQty: number | null;
}

export interface EntryMacros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** true si no se pudo convertir la unidad a gramos (el usuario ajusta a mano). */
  isEstimated: boolean;
}

const round = (n: number, d: number) => {
  const p = 10 ** d;
  return Math.round(n * p) / p;
};

/** Gramos/ml equivalentes de `quantity` en `unit`, o `null` si no se puede resolver. */
export function resolveGrams(food: FoodLike, quantity: number, unit: string): number | null {
  if (unit === 'g' || unit === 'ml') return quantity;
  if ((unit === 'porción' || unit === 'unidad') && food.servingQty && food.servingQty > 0) {
    return quantity * food.servingQty;
  }
  return null;
}

export function computeEntryMacros(food: FoodLike, quantity: number, unit: string): EntryMacros {
  const grams = resolveGrams(food, quantity, unit);
  if (grams === null || !Number.isFinite(grams) || grams < 0) {
    return { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, isEstimated: true };
  }
  const f = grams / 100;
  return {
    kcal: round(food.kcalPer100 * f, 0),
    proteinG: round(food.proteinPer100 * f, 1),
    carbsG: round(food.carbsPer100 * f, 1),
    fatG: round(food.fatPer100 * f, 1),
    isEstimated: false,
  };
}

export interface MacroTotals {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function sumMacros(rows: MacroTotals[]): MacroTotals {
  const t = rows.reduce(
    (a, r) => ({
      kcal: a.kcal + r.kcal,
      proteinG: a.proteinG + r.proteinG,
      carbsG: a.carbsG + r.carbsG,
      fatG: a.fatG + r.fatG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
  return {
    kcal: Math.round(t.kcal),
    proteinG: round(t.proteinG, 1),
    carbsG: round(t.carbsG, 1),
    fatG: round(t.fatG, 1),
  };
}

/** kcal implícitas de los macros (4/4/9), para validar/estimar. */
export function kcalFromMacros(m: Omit<MacroTotals, 'kcal'>): number {
  return Math.round(m.proteinG * 4 + m.carbsG * 4 + m.fatG * 9);
}
