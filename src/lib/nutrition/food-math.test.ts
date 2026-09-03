import { describe, expect, it } from 'vitest';
import { computeEntryMacros, kcalFromMacros, resolveGrams, sumMacros } from './food-math';

const chicken = { kcalPer100: 165, proteinPer100: 31, carbsPer100: 0, fatPer100: 3.6, servingQty: null };
const egg = { kcalPer100: 143, proteinPer100: 12.6, carbsPer100: 0.7, fatPer100: 9.5, servingQty: 50 };

describe('resolveGrams', () => {
  it('g / ml pasan directo', () => {
    expect(resolveGrams(chicken, 200, 'g')).toBe(200);
    expect(resolveGrams(chicken, 250, 'ml')).toBe(250);
  });
  it('porción / unidad usan servingQty', () => {
    expect(resolveGrams(egg, 2, 'unidad')).toBe(100);
    expect(resolveGrams(egg, 1.5, 'porción')).toBe(75);
  });
  it('null si no hay servingQty para unidades', () => {
    expect(resolveGrams(chicken, 1, 'unidad')).toBeNull();
    expect(resolveGrams(chicken, 1, 'taza')).toBeNull();
  });
});

describe('computeEntryMacros', () => {
  it('200 g de pollo', () => {
    expect(computeEntryMacros(chicken, 200, 'g')).toEqual({
      kcal: 330,
      proteinG: 62,
      carbsG: 0,
      fatG: 7.2,
      isEstimated: false,
    });
  });
  it('2 huevos', () => {
    expect(computeEntryMacros(egg, 2, 'unidad')).toEqual({
      kcal: 143,
      proteinG: 12.6,
      carbsG: 0.7,
      fatG: 9.5,
      isEstimated: false,
    });
  });
  it('unidad no resoluble → 0 y estimado', () => {
    const r = computeEntryMacros(chicken, 1, 'taza');
    expect(r.isEstimated).toBe(true);
    expect(r.kcal).toBe(0);
  });
});

describe('sumMacros', () => {
  it('suma y redondea', () => {
    expect(
      sumMacros([
        { kcal: 330, proteinG: 62, carbsG: 0, fatG: 7.2 },
        { kcal: 143, proteinG: 12.6, carbsG: 0.7, fatG: 9.5 },
      ]),
    ).toEqual({ kcal: 473, proteinG: 74.6, carbsG: 0.7, fatG: 16.7 });
  });
});

describe('kcalFromMacros', () => {
  it('4/4/9', () => {
    expect(kcalFromMacros({ proteinG: 30, carbsG: 40, fatG: 10 })).toBe(370);
  });
});
