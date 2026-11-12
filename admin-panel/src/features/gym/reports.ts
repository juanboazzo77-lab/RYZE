/**
 * Reportes del gimnasio: cálculos simples sobre fechas y cupos. Funciones puras (sin base de datos). Los meses son
 * "aaaa-mm" y las fechas se toman en UTC (las fechas de cuotas y de reservas se guardan como día, sin hora).
 */

export const monthKey = (d: Date | string): string => (typeof d === 'string' ? d : d.toISOString()).slice(0, 7);

/** Los últimos `n` meses ("aaaa-mm"), del más viejo al actual. */
export function lastMonths(n: number, now: Date): string[] {
  const out: string[] = [];
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(y, m - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const monthLabel = (key: string): string => `${MONTH_NAMES[Number(key.slice(5, 7)) - 1] ?? key} ${key.slice(2, 4)}`;

/** Cuenta cuántas fechas caen en cada mes de la lista (las que están fuera se ignoran). */
export function countByMonth(dates: Array<Date | null>, months: string[]): number[] {
  const idx = new Map(months.map((m, i) => [m, i]));
  const out = months.map(() => 0);
  for (const d of dates) {
    if (!d) continue;
    const i = idx.get(monthKey(d));
    if (i !== undefined) out[i]! += 1;
  }
  return out;
}

/** Suma montos por mes de la lista. */
export function sumByMonth(items: Array<{ date: Date; amount: number }>, months: string[]): number[] {
  const idx = new Map(months.map((m, i) => [m, i]));
  const out = months.map(() => 0);
  for (const it of items) {
    const i = idx.get(monthKey(it.date));
    if (i !== undefined) out[i]! += it.amount;
  }
  return out;
}

/** Porcentaje de ocupación (0 a 100) de una clase: lugares tomados sobre los lugares que hubo. */
export function fillPercent(booked: number, capacity: number, occurrences: number): number {
  const seats = capacity * occurrences;
  if (seats <= 0) return 0;
  return Math.min(100, Math.round((booked / seats) * 100));
}

/** Cuántas veces se dio una clase de un día de la semana (1 = lunes … 7 = domingo) entre dos fechas (yyyy-mm-dd, ambas incluidas). */
export function occurrencesBetween(weekday: number, fromISO: string, toISO: string): number {
  let n = 0;
  const end = Date.parse(`${toISO}T00:00:00Z`);
  for (let t = Date.parse(`${fromISO}T00:00:00Z`); t <= end; t += 24 * 60 * 60 * 1000) {
    const d = new Date(t).getUTCDay();
    if ((d === 0 ? 7 : d) === weekday) n += 1;
  }
  return n;
}
