import type { MealPlan } from './meal-plan-schema';

/** Margen aceptable respecto del objetivo de calorías del día. */
export const KCAL_TOLERANCE = 0.03;

/** Calorías totales del día (suma de todos los items). */
export function planKcal(plan: MealPlan): number {
  return plan.meals.reduce((sum, m) => sum + m.items.reduce((s, i) => s + i.kcal, 0), 0);
}

/** Desvío relativo del plan respecto del objetivo (positivo = se pasa). */
export function kcalDeviation(plan: MealPlan, targetKcal: number): number {
  if (targetKcal <= 0) return 0;
  return (planKcal(plan) - targetKcal) / targetKcal;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Último recurso cuando la IA no llega al objetivo: escala todas las porciones en la
 * misma proporción para que el día quede en las calorías pedidas. Mantiene las
 * proporciones entre alimentos. Si el cambio es grande (> 8 %), la medida casera
 * deja de ser confiable y se saca.
 */
export function scalePlanToKcal(plan: MealPlan, targetKcal: number): MealPlan {
  const total = planKcal(plan);
  if (total <= 0 || targetKcal <= 0) return plan;
  // Nunca más de ±40 %: si hace falta más, el plan no era razonable.
  const ratio = Math.min(1.4, Math.max(0.6, targetKcal / total));
  const dropMeasure = Math.abs(ratio - 1) > 0.08;
  return {
    ...plan,
    meals: plan.meals.map((m) => ({
      ...m,
      items: m.items.map((i) => ({
        ...i,
        grams: Math.max(1, Math.round(i.grams * ratio)),
        kcal: Math.round(i.kcal * ratio),
        proteinG: round1(i.proteinG * ratio),
        carbsG: round1(i.carbsG * ratio),
        fatG: round1(i.fatG * ratio),
        householdMeasure: dropMeasure ? undefined : i.householdMeasure,
      })),
    })),
  };
}

/** Resumen por comida para pedirle a la IA que corrija el total. */
export function describeTotals(plan: MealPlan): string {
  return plan.meals
    .map((m) => `${m.title}: ${Math.round(m.items.reduce((s, i) => s + i.kcal, 0))} kcal`)
    .join(' · ');
}
