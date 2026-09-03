/**
 * Cálculos de progresión (volumen, 1RM estimado, comparación entre sesiones).
 * Funciones puras y testeadas. No tocan la DB.
 */

export interface SetLike {
  weightKg: number | null;
  reps: number | null;
  isWarmup?: boolean;
  isCompleted?: boolean;
}

/** Epley: 1RM ≈ peso × (1 + reps/30). reps ≤ 1 → el propio peso. */
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

const usable = (s: SetLike) =>
  (s.isCompleted ?? true) && !(s.isWarmup ?? false) && s.reps != null && s.reps > 0;

/** Volumen de una sesión: Σ (peso × reps) de las series efectivas. */
export function sessionVolume(sets: SetLike[]): number {
  return round1(
    sets
      .filter(usable)
      .reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0),
  );
}

/** Serie "top" del ejercicio en la sesión: mayor peso, desempata por reps. */
export function topSet(sets: SetLike[]): { weightKg: number; reps: number } | null {
  const w = sets.filter((s) => usable(s) && s.weightKg != null && s.weightKg > 0);
  if (w.length === 0) return null;
  const best = w.reduce((a, b) =>
    (b.weightKg ?? 0) > (a.weightKg ?? 0) ||
    ((b.weightKg ?? 0) === (a.weightKg ?? 0) && (b.reps ?? 0) > (a.reps ?? 0))
      ? b
      : a,
  );
  return { weightKg: best.weightKg!, reps: best.reps! };
}

/** Mayor cantidad de reps en una sola serie efectiva (para ejercicios de peso corporal). */
export function maxReps(sets: SetLike[]): number {
  return sets.filter(usable).reduce((m, s) => Math.max(m, s.reps ?? 0), 0);
}

/** Mejor 1RM estimado de la sesión. */
export function bestEst1RM(sets: SetLike[]): number {
  return round1(
    sets
      .filter((s) => usable(s) && s.weightKg != null && s.weightKg > 0)
      .reduce((m, s) => Math.max(m, epley1RM(s.weightKg!, s.reps!)), 0),
  );
}

export interface SessionMetrics {
  topWeightKg: number;
  topReps: number;
  maxReps: number;
  volume: number;
  est1RM: number;
}

export function sessionMetrics(sets: SetLike[]): SessionMetrics {
  const t = topSet(sets);
  return {
    topWeightKg: t?.weightKg ?? 0,
    topReps: t?.reps ?? 0,
    maxReps: maxReps(sets),
    volume: sessionVolume(sets),
    est1RM: bestEst1RM(sets),
  };
}

export interface Improvements {
  moreWeight: boolean;
  moreReps: boolean;
  moreVolume: boolean;
  more1RM: boolean;
}

/** Compara una sesión con la inmediatamente anterior del mismo ejercicio. */
export function compareToPrev(curr: SessionMetrics, prev: SessionMetrics | null): Improvements {
  if (!prev) return { moreWeight: false, moreReps: false, moreVolume: false, more1RM: false };
  return {
    moreWeight: curr.topWeightKg > prev.topWeightKg,
    moreReps: curr.maxReps > prev.maxReps,
    moreVolume: curr.volume > prev.volume,
    more1RM: curr.est1RM > prev.est1RM,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
