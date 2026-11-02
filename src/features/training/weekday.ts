/** Corre un día de la semana (1 = lunes … 7 = domingo) `by` días, dando la vuelta a la semana. */
export function shiftWeekday(weekday: number, by: number): number {
  return ((((weekday - 1 + by) % 7) + 7) % 7) + 1;
}

/**
 * Corrimiento que rige hoy en una rutina: el que se pidió esta semana ("hoy no pude entrenar"), o 0
 * si es de una semana anterior — así los días vuelven solos a los de siempre.
 * `currentWeekStartISO` es el inicio (yyyy-mm-dd) de la semana en curso.
 */
export function activeWeekShift(
  plan: { weekShift: number; weekShiftStart: Date | null },
  currentWeekStartISO: string,
): number {
  if (!plan.weekShiftStart) return 0;
  return plan.weekShiftStart.toISOString().slice(0, 10) === currentWeekStartISO ? plan.weekShift : 0;
}

/** Día de la semana efectivo de una rutina esta semana (null si no tiene día asignado). */
export function effectiveWeekday(weekday: number | null, shift: number): number | null {
  return weekday == null ? null : shiftWeekday(weekday, shift);
}
