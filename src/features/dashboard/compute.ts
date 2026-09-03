/**
 * Cálculos puros del dashboard (sin DB), testeables en aislamiento.
 */

export interface DatedWeight {
  /** yyyy-mm-dd */
  date: string;
  weightKg: number;
}

/** Media de los pesos cuya fecha cae en [fromISO, toISO). */
function avgInRange(entries: DatedWeight[], fromISO: string, toISO: string): number | null {
  const inRange = entries.filter((e) => e.date >= fromISO && e.date < toISO);
  if (inRange.length === 0) return null;
  return inRange.reduce((s, e) => s + e.weightKg, 0) / inRange.length;
}

/**
 * Cambio de peso semana a semana usando medias móviles de 7 días (evita el
 * ruido de las fluctuaciones diarias). `null` si no hay datos en ambas ventanas.
 * Ventana actual: [todayISO-6, todayISO+1). Ventana previa: [-13, -6).
 */
export function weeklyWeightChangeKg(
  entries: DatedWeight[],
  todayISO: string,
  addDays: (iso: string, n: number) => string,
): number | null {
  const curr = avgInRange(entries, addDays(todayISO, -6), addDays(todayISO, 1));
  const prev = avgInRange(entries, addDays(todayISO, -13), addDays(todayISO, -6));
  if (curr === null || prev === null) return null;
  return Math.round((curr - prev) * 100) / 100;
}

/**
 * Racha de días consecutivos (terminando hoy o ayer) con al menos un
 * entrenamiento completado. `completedDays` es un set de yyyy-mm-dd.
 */
export function workoutStreak(
  completedDays: Set<string>,
  todayISO: string,
  addDays: (iso: string, n: number) => string,
): number {
  if (completedDays.size === 0) return 0;
  // Arranca hoy si entrenó hoy, si no ayer (para no "romper" la racha a la mañana).
  let cursor = completedDays.has(todayISO) ? todayISO : addDays(todayISO, -1);
  let streak = 0;
  while (completedDays.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export interface DayMacros {
  kcal: number;
  proteinG: number;
}
export interface MacroTarget {
  kcal: number;
  proteinG: number;
}

/**
 * Cumplimiento nutricional: fracción de días registrados que quedaron dentro
 * de ±`kcalTolerance` del objetivo de calorías Y con ≥`proteinFloor` de la
 * proteína objetivo. Devuelve `{ adherentDays, loggedDays, pct }`.
 */
export function nutritionAdherence(
  perDay: DayMacros[],
  target: MacroTarget,
  kcalTolerance = 0.1,
  proteinFloor = 0.9,
): { adherentDays: number; loggedDays: number; pct: number | null } {
  const loggedDays = perDay.length;
  if (loggedDays === 0 || target.kcal <= 0) {
    return { adherentDays: 0, loggedDays, pct: null };
  }
  const adherentDays = perDay.filter(
    (d) =>
      Math.abs(d.kcal - target.kcal) <= target.kcal * kcalTolerance &&
      d.proteinG >= target.proteinG * proteinFloor,
  ).length;
  return { adherentDays, loggedDays, pct: Math.round((adherentDays / loggedDays) * 100) };
}
