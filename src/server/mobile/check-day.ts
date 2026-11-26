import { DateTime } from 'luxon';
import { addDaysISO, isoToUtcDate, localTodayISO } from '@/lib/date';
import { RejectedOperation } from './apply';

/** Fecha que existe de verdad (no "31 de febrero") y no posterior a mañana según cuándo se anotó. */
export function checkDay(date: string, at: Date, timezone: string): Date {
  const parsed = isoToUtcDate(date);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new RejectedOperation('INVALID');
  }
  const limit = addDaysISO(localTodayISO(timezone, DateTime.fromJSDate(at)), 1);
  if (date > limit) throw new RejectedOperation('FUTURE_DATE');
  return parsed;
}
