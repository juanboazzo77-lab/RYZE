import { DateTime } from 'luxon';
import { addDaysISO } from '@/lib/date';

/** Lógica pura del calendario de puntos (sin base de datos), para poder testearla. */

export type DotState = 'trained' | 'rest' | 'future';

export interface DotCell {
  dateISO: string;
  /** Columna = semana del año; fila = día de la semana (0 = primer día de la semana de la persona). */
  col: number;
  row: number;
  state: DotState;
}

export interface MonthMark {
  /** 1–12 */
  month: number;
  col: number;
}

export interface YearGrid {
  year: number;
  cells: DotCell[];
  cols: number;
  months: MonthMark[];
  /** Días distintos con entrenamiento en el año. */
  trainedDays: number;
}

/**
 * La cuadrícula de un año: una columna por semana y una fila por día de la semana, como el calendario de
 * actividad de GitHub. `weekStart` es 1 (lunes) a 7 (domingo), igual que `profile.weekStart`.
 */
export function buildYearGrid(
  year: number,
  trained: ReadonlySet<string>,
  todayISO: string,
  weekStart: number,
): YearGrid {
  const first = DateTime.fromObject({ year, month: 1, day: 1 }, { zone: 'utc' });
  const daysInYear = first.daysInYear;
  const leading = (first.weekday - weekStart + 7) % 7;

  const cells: DotCell[] = [];
  const months: MonthMark[] = [];
  let trainedDays = 0;
  for (let i = 0; i < daysInYear; i++) {
    const d = first.plus({ days: i });
    const dateISO = d.toISODate()!;
    const slot = leading + i;
    const state: DotState = dateISO > todayISO ? 'future' : trained.has(dateISO) ? 'trained' : 'rest';
    if (state === 'trained') trainedDays++;
    const col = Math.floor(slot / 7);
    cells.push({ dateISO, col, row: slot % 7, state });
    if (d.day === 1) months.push({ month: d.month, col });
  }
  return { year, cells, cols: Math.ceil((leading + daysInYear) / 7), months, trainedDays };
}

/** Años a mostrar, del más reciente al más viejo: desde el del primer entrenamiento hasta el actual (con un tope). */
export function yearsToShow(trained: ReadonlySet<string>, todayISO: string, max = 5): number[] {
  const current = Number(todayISO.slice(0, 4));
  let oldest = current;
  for (const iso of trained) {
    const y = Number(iso.slice(0, 4));
    if (y < oldest) oldest = y;
  }
  const out: number[] = [];
  for (let y = current; y >= oldest && out.length < max; y--) out.push(y);
  return out;
}

/** La racha más larga de días seguidos con entrenamiento (en todo el historial). */
export function longestStreak(trained: ReadonlySet<string>): number {
  let best = 0;
  for (const iso of trained) {
    // Sólo se cuenta desde el primer día de cada racha, para no recorrer lo mismo muchas veces.
    if (trained.has(addDaysISO(iso, -1))) continue;
    let n = 1;
    let cursor = addDaysISO(iso, 1);
    while (trained.has(cursor)) {
      n++;
      cursor = addDaysISO(cursor, 1);
    }
    if (n > best) best = n;
  }
  return best;
}
