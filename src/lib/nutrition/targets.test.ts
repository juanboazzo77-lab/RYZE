import { describe, expect, it } from 'vitest';
import {
  ageFromBirthdate,
  computeTargets,
  defaultWeeklyRateKg,
  goalAdjustmentPct,
  harrisBenedict,
} from './targets';

describe('harrisBenedict', () => {
  it('hombre 80kg / 180cm / 30a ≈ 1853.6', () => {
    expect(harrisBenedict({ sex: 'MALE', weightKg: 80, heightCm: 180, ageYears: 30 })).toBeCloseTo(1853.63, 1);
  });
  it('mujer 60kg / 165cm / 30a ≈ 1383.7', () => {
    expect(harrisBenedict({ sex: 'FEMALE', weightKg: 60, heightCm: 165, ageYears: 30 })).toBeCloseTo(1383.68, 1);
  });
  it('OTHER queda entre las dos fórmulas', () => {
    const m = harrisBenedict({ sex: 'MALE', weightKg: 70, heightCm: 170, ageYears: 30 });
    const f = harrisBenedict({ sex: 'FEMALE', weightKg: 70, heightCm: 170, ageYears: 30 });
    const o = harrisBenedict({ sex: 'OTHER', weightKg: 70, heightCm: 170, ageYears: 30 });
    expect(o).toBeGreaterThan(f);
    expect(o).toBeLessThan(m);
  });
});

describe('goalAdjustmentPct', () => {
  it('MAINTAIN = 0', () => {
    expect(goalAdjustmentPct('MAINTAIN', 2500)).toBe(0);
  });
  it('LOSE_FAT sin ritmo = -18%', () => {
    expect(goalAdjustmentPct('LOSE_FAT', 2500)).toBe(-18);
  });
  it('LOSE_FAT con ritmo se clampa a [-25, -8]', () => {
    expect(goalAdjustmentPct('LOSE_FAT', 2500, 2)).toBe(-25); // ritmo enorme → tope
    expect(goalAdjustmentPct('LOSE_FAT', 2500, 0.05)).toBe(-8); // ritmo mínimo → piso
  });
  it('GAIN_MUSCLE positivo', () => {
    expect(goalAdjustmentPct('GAIN_MUSCLE', 2500)).toBe(10);
  });
});

describe('computeTargets', () => {
  const base = {
    sex: 'MALE' as const,
    ageYears: 30,
    heightCm: 180,
    weightKg: 80,
    activityLevel: 'MODERATE' as const,
  };

  it('mantener: kcal ≈ TDEE y macros cierran', () => {
    const r = computeTargets({ ...base, goal: 'MAINTAIN' });
    expect(r.bmr).toBe(1854);
    expect(r.tdee).toBe(Math.round(1854 * 1.55));
    expect(r.kcal).toBe(Math.round((r.tdee / 10)) * 10);
    // kcal reconstruido desde macros dentro de ±30 (redondeo a 5g)
    const fromMacros = r.proteinG * 4 + r.carbsG * 4 + r.fatG * 9;
    expect(Math.abs(fromMacros - r.kcal)).toBeLessThanOrEqual(30);
  });

  it('perder grasa: déficit y más proteína', () => {
    const cut = computeTargets({ ...base, goal: 'LOSE_FAT' });
    const maintain = computeTargets({ ...base, goal: 'MAINTAIN' });
    expect(cut.kcal).toBeLessThan(maintain.kcal);
    expect(cut.adjustmentPct).toBeLessThan(0);
    expect(cut.proteinG).toBeGreaterThanOrEqual(maintain.proteinG);
  });

  it('ganar músculo: superávit', () => {
    const bulk = computeTargets({ ...base, goal: 'GAIN_MUSCLE' });
    const maintain = computeTargets({ ...base, goal: 'MAINTAIN' });
    expect(bulk.kcal).toBeGreaterThan(maintain.kcal);
  });

  it('deporte sube el TDEE (3,5% por sesión, tope 25%)', () => {
    const none = computeTargets({ ...base, goal: 'MAINTAIN' });
    const some = computeTargets({ ...base, goal: 'MAINTAIN', sportSessionsPerWeek: 4 });
    const capped = computeTargets({ ...base, goal: 'MAINTAIN', sportSessionsPerWeek: 20 });
    expect(some.tdee).toBeGreaterThan(none.tdee);
    expect(some.tdee).toBe(Math.round(none.tdee * 1.14));
    expect(capped.tdee).toBe(Math.round(none.tdee * 1.25));
  });

  it('todos los macros son no negativos y múltiplos de 5', () => {
    const r = computeTargets({ ...base, goal: 'LOSE_FAT', weeklyRateKg: 0.5 });
    for (const v of [r.proteinG, r.carbsG, r.fatG]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v % 5).toBe(0);
    }
  });
});

describe('helpers', () => {
  it('defaultWeeklyRateKg', () => {
    expect(defaultWeeklyRateKg('LOSE_FAT')).toBe(0.5);
    expect(defaultWeeklyRateKg('MAINTAIN')).toBeNull();
  });
  it('ageFromBirthdate', () => {
    expect(ageFromBirthdate(new Date('1994-06-15'), new Date('2026-09-03'))).toBe(32);
    expect(ageFromBirthdate(new Date('1994-12-15'), new Date('2026-09-03'))).toBe(31);
  });
});
