import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import {
  nutritionAdherence,
  weeklyWeightChangeKg,
  workoutStreak,
  type DatedWeight,
} from './compute';

const addDays = (iso: string, n: number) =>
  DateTime.fromISO(iso, { zone: 'utc' }).plus({ days: n }).toISODate()!;

describe('weeklyWeightChangeKg', () => {
  const today = '2026-09-10';
  it('null si falta una de las dos ventanas', () => {
    const only: DatedWeight[] = [{ date: '2026-09-09', weightKg: 80 }];
    expect(weeklyWeightChangeKg(only, today, addDays)).toBeNull();
  });
  it('compara medias móviles de 7 días', () => {
    const entries: DatedWeight[] = [
      // ventana previa [-13,-6): promedio 81
      { date: '2026-08-30', weightKg: 81 },
      { date: '2026-09-02', weightKg: 81 },
      // ventana actual [-6,+1): promedio 80
      { date: '2026-09-06', weightKg: 80.5 },
      { date: '2026-09-09', weightKg: 79.5 },
    ];
    expect(weeklyWeightChangeKg(entries, today, addDays)).toBe(-1);
  });
});

describe('workoutStreak', () => {
  const today = '2026-09-10';
  it('0 sin datos', () => {
    expect(workoutStreak(new Set(), today, addDays)).toBe(0);
  });
  it('cuenta días consecutivos terminando hoy', () => {
    expect(workoutStreak(new Set(['2026-09-10', '2026-09-09', '2026-09-08']), today, addDays)).toBe(3);
  });
  it('no rompe la racha si hoy todavía no entrenó', () => {
    expect(workoutStreak(new Set(['2026-09-09', '2026-09-08']), today, addDays)).toBe(2);
  });
  it('se corta en el primer hueco', () => {
    expect(workoutStreak(new Set(['2026-09-10', '2026-09-08', '2026-09-07']), today, addDays)).toBe(1);
  });
});

describe('nutritionAdherence', () => {
  const target = { kcal: 2500, proteinG: 180 };
  it('null sin días registrados', () => {
    expect(nutritionAdherence([], target).pct).toBeNull();
  });
  it('cuenta días dentro de tolerancia de kcal y piso de proteína', () => {
    const r = nutritionAdherence(
      [
        { kcal: 2450, proteinG: 175 }, // ok
        { kcal: 2510, proteinG: 190 }, // ok
        { kcal: 2000, proteinG: 180 }, // kcal fuera
        { kcal: 2500, proteinG: 120 }, // proteína baja
      ],
      target,
    );
    expect(r).toEqual({ adherentDays: 2, loggedDays: 4, pct: 50 });
  });
});
