import { DateTime } from 'luxon';

/** Fecha (yyyy-mm-dd) de "hoy" en la zona horaria del usuario. */
export function localTodayISO(timezone: string, now: DateTime = DateTime.now()): string {
  return now.setZone(timezone).toISODate() ?? now.toISODate()!;
}

/** Un `Date` a medianoche UTC del día local dado — así se guardan las columnas `@db.Date`. */
export function isoToUtcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function localToday(timezone: string): Date {
  return isoToUtcDate(localTodayISO(timezone));
}

/** yyyy-mm-dd `n` días antes de `iso`. */
export function addDaysISO(iso: string, days: number): string {
  return DateTime.fromISO(iso, { zone: 'utc' }).plus({ days }).toISODate()!;
}

/**
 * Inicio de la semana que contiene `iso`, respetando `weekStart` (1 = lunes …
 * 7 = domingo). Devuelve yyyy-mm-dd.
 */
export function weekStartISO(iso: string, weekStart: number): string {
  const d = DateTime.fromISO(iso, { zone: 'utc' });
  // luxon: weekday 1 = lunes … 7 = domingo
  const diff = (d.weekday - weekStart + 7) % 7;
  return d.minus({ days: diff }).toISODate()!;
}

export type DayPart = 'morning' | 'afternoon' | 'evening';

export function dayPart(timezone: string, now: DateTime = DateTime.now()): DayPart {
  const h = now.setZone(timezone).hour;
  if (h < 12) return 'morning';
  if (h < 19) return 'afternoon';
  return 'evening';
}
