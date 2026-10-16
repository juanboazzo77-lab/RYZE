import { describe, expect, it } from 'vitest';
import { kcalDeviation, planKcal, scalePlanToKcal, withinBand } from './meal-plan-fit';
import type { MealPlan } from './meal-plan-schema';

const plan = (kcals: number[]): MealPlan => ({
  meals: [
    {
      type: 'LUNCH',
      title: 'Almuerzo',
      items: kcals.map((k, n) => ({
        name: `Item ${n}`,
        grams: 100,
        kcal: k,
        proteinG: k / 10,
        carbsG: k / 8,
        fatG: k / 30,
        householdMeasure: '1 taza',
      })),
    },
  ],
  shoppingList: [],
});

describe('meal-plan-fit', () => {
  it('suma las calorías del día y calcula el desvío', () => {
    const p = plan([500, 700, 400]);
    expect(planKcal(p)).toBe(1600);
    expect(kcalDeviation(p, 1500)).toBeCloseTo(100 / 1500);
  });

  it('la banda acepta quedar un poco corto pero casi nada de más', () => {
    expect(withinBand(plan([1000, 960]), 2000)).toBe(true); // -2 %
    expect(withinBand(plan([1000, 1005]), 2000)).toBe(true); // +0,25 %
    expect(withinBand(plan([1000, 1040]), 2000)).toBe(false); // +2 %
    expect(withinBand(plan([1000, 800]), 2000)).toBe(false); // -10 %
  });

  it('escala las porciones para llegar al objetivo', () => {
    const p = plan([800, 700, 500]); // 2000
    const out = scalePlanToKcal(p, 1800);
    expect(Math.abs(planKcal(out) - 1800)).toBeLessThanOrEqual(3);
    expect(out.meals[0]!.items[0]!.grams).toBe(90);
  });

  it('saca la medida casera cuando el ajuste es grande', () => {
    const big = scalePlanToKcal(plan([1000, 600]), 1200); // -25 %
    expect(big.meals[0]!.items[0]!.householdMeasure).toBeUndefined();
    const small = scalePlanToKcal(plan([1000, 600]), 1540); // -3.75 %
    expect(small.meals[0]!.items[0]!.householdMeasure).toBe('1 taza');
  });

  it('no escala más de ±40 %', () => {
    const out = scalePlanToKcal(plan([500]), 5000);
    expect(planKcal(out)).toBeCloseTo(700, 0);
  });
});
