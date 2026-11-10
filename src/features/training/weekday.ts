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

/**
 * Día de la semana de cada día de la rutina que YA se hizo esta semana: el día en que se hizo (hora de la persona).
 * Si el mismo día de la rutina se hizo más de una vez, vale la última. `weekStartISO` es el inicio (yyyy-mm-dd) de
 * la semana en curso; lo hecho antes de esa fecha no cuenta.
 */
export function doneWeekdays(
  rows: Array<{ planDayId: string | null; finishedAt: Date | null }>,
  timezone: string,
  weekStartISO: string,
): Map<string, number> {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const latest = new Map<string, { at: number; weekday: number }>();
  for (const r of rows) {
    if (!r.planDayId || !r.finishedAt) continue;
    const day = fmt.format(r.finishedAt); // yyyy-mm-dd en la zona de la persona
    if (day < weekStartISO) continue;
    const js = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = domingo
    const prev = latest.get(r.planDayId);
    if (!prev || r.finishedAt.getTime() > prev.at) latest.set(r.planDayId, { at: r.finishedAt.getTime(), weekday: js === 0 ? 7 : js });
  }
  return new Map([...latest].map(([id, v]) => [id, v.weekday]));
}

/**
 * Día de la semana de un día de la rutina esta semana. Si ya se hizo, queda en el día en que se hizo: pasar un
 * día no cambia lo que ya entrenaste. Si no, el día de siempre corrido por `shift` (null si no tiene día asignado).
 */
export function weekdayThisWeek(day: { id: string; weekday: number | null }, shift: number, done?: ReadonlyMap<string, number>): number | null {
  if (day.weekday == null) return null;
  return done?.get(day.id) ?? effectiveWeekday(day.weekday, shift);
}
