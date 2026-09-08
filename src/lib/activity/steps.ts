/**
 * Cálculos de actividad (pasos). Funciones puras, testeables.
 */

export interface DaySteps {
  /** yyyy-mm-dd */
  date: string;
  steps: number;
}

/** Promedio de pasos de los últimos `days` días (sólo días con registro). */
export function averageSteps(entries: DaySteps[], todayISO: string, days: number): number | null {
  const from = shiftISO(todayISO, -(days - 1));
  const inRange = entries.filter((e) => e.date >= from && e.date <= todayISO);
  if (inRange.length === 0) return null;
  const total = inRange.reduce((s, e) => s + e.steps, 0);
  return Math.round(total / inRange.length);
}

/**
 * Lectura cualitativa del nivel de NEAT según pasos/día promedio.
 * < 5000 sedentario · 5000–7499 poco activo · 7500–9999 activo · ≥ 10000 muy activo
 */
export function stepLevel(avg: number | null): 'none' | 'sedentary' | 'low' | 'active' | 'high' {
  if (avg === null) return 'none';
  if (avg < 5000) return 'sedentary';
  if (avg < 7500) return 'low';
  if (avg < 10000) return 'active';
  return 'high';
}

function shiftISO(iso: string, deltaDays: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}
