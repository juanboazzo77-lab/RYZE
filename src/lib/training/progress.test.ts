import { describe, expect, it } from 'vitest';
import {
  bestEst1RM,
  compareToPrev,
  epley1RM,
  maxReps,
  sessionMetrics,
  sessionVolume,
  topSet,
} from './progress';

const S = (weightKg: number | null, reps: number | null, extra: object = {}) => ({
  weightKg,
  reps,
  isWarmup: false,
  isCompleted: true,
  ...extra,
});

describe('epley1RM', () => {
  it('reps<=1 devuelve el peso', () => {
    expect(epley1RM(100, 1)).toBe(100);
  });
  it('80kg x 10 ≈ 106.7', () => {
    expect(epley1RM(80, 10)).toBeCloseTo(106.67, 1);
  });
});

describe('sessionVolume', () => {
  it('suma peso×reps de series efectivas', () => {
    expect(sessionVolume([S(80, 10), S(80, 9), S(80, 8)])).toBe(80 * 27);
  });
  it('ignora warmups, no completadas y sin reps', () => {
    expect(
      sessionVolume([
        S(80, 10),
        S(60, 12, { isWarmup: true }),
        S(80, 10, { isCompleted: false }),
        S(80, null),
      ]),
    ).toBe(800);
  });
});

describe('topSet / maxReps / bestEst1RM', () => {
  const sets = [S(80, 10), S(85, 6), S(85, 8), S(null, 15)];
  it('topSet = mayor peso, desempata por reps', () => {
    expect(topSet(sets)).toEqual({ weightKg: 85, reps: 8 });
  });
  it('maxReps considera todas las series efectivas', () => {
    expect(maxReps(sets)).toBe(15);
  });
  it('bestEst1RM toma el mejor 1RM estimado', () => {
    expect(bestEst1RM(sets)).toBeCloseTo(Math.max(epley1RM(80, 10), epley1RM(85, 6), epley1RM(85, 8)), 1);
  });
});

describe('compareToPrev', () => {
  it('sin previa → nada mejora', () => {
    const m = sessionMetrics([S(80, 10)]);
    expect(compareToPrev(m, null)).toEqual({
      moreWeight: false,
      moreReps: false,
      moreVolume: false,
      more1RM: false,
    });
  });
  it('detecta más peso y más volumen', () => {
    const prev = sessionMetrics([S(80, 10), S(80, 10)]);
    const curr = sessionMetrics([S(85, 8), S(85, 8)]);
    const cmp = compareToPrev(curr, prev);
    expect(cmp.moreWeight).toBe(true);
    expect(cmp.more1RM).toBe(true);
    // volumen: 85*16=1360 vs 80*20=1600 → NO más volumen
    expect(cmp.moreVolume).toBe(false);
  });
});
