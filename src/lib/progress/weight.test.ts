import { describe, expect, it } from 'vitest';
import {
  linearTrend,
  movingAverage,
  periodChangeKg,
  rangeToDays,
  recentAverage,
} from './weight';

const P = (date: string, weightKg: number) => ({ date, weightKg });

describe('movingAverage', () => {
  it('promedia la ventana de 7 días que termina en cada punto', () => {
    const ma = movingAverage(
      [P('2026-09-01', 80), P('2026-09-02', 82), P('2026-09-03', 81)],
      7,
    );
    expect(ma[0]).toEqual({ date: '2026-09-01', weightKg: 80 });
    expect(ma[1]).toEqual({ date: '2026-09-02', weightKg: 81 });
    expect(ma[2]).toEqual({ date: '2026-09-03', weightKg: 81 });
  });
});

describe('periodChangeKg', () => {
  it('null si falta data en alguna ventana', () => {
    expect(periodChangeKg([P('2026-09-10', 80)], '2026-09-10', 7)).toBeNull();
  });
  it('compara medias de 7d de ahora vs. hace N días', () => {
    const pts = [
      P('2026-08-28', 81),
      P('2026-08-29', 81),
      P('2026-09-08', 80),
      P('2026-09-09', 80),
    ];
    // ventana actual (09-10 ±7): 80 · ventana -13d (08-28 ±7): 81
    expect(periodChangeKg(pts, '2026-09-10', 13)).toBe(-1);
  });
});

describe('recentAverage', () => {
  it('promedia los últimos 7 días', () => {
    expect(recentAverage([P('2026-09-08', 80), P('2026-09-10', 82)], '2026-09-10', 7)).toBe(81);
  });
});

describe('linearTrend', () => {
  it('null con menos de 3 puntos', () => {
    expect(linearTrend([P('2026-09-01', 80), P('2026-09-02', 80)])).toBeNull();
  });
  it('pendiente descendente → dirección down y kg/semana negativos', () => {
    const t = linearTrend([
      P('2026-09-01', 82),
      P('2026-09-08', 81),
      P('2026-09-15', 80),
      P('2026-09-22', 79),
    ]);
    expect(t?.direction).toBe('down');
    expect(t?.kgPerWeek).toBeCloseTo(-1, 1);
  });
  it('peso estable → flat', () => {
    const t = linearTrend([P('2026-09-01', 80), P('2026-09-08', 80), P('2026-09-15', 80.01)]);
    expect(t?.direction).toBe('flat');
  });
});

describe('rangeToDays', () => {
  it('mapea presets y "todo"', () => {
    expect(rangeToDays('30')).toBe(30);
    expect(rangeToDays('365')).toBe(365);
    expect(rangeToDays(undefined)).toBeGreaterThan(9999);
    expect(rangeToDays('all')).toBeGreaterThan(9999);
  });
});
