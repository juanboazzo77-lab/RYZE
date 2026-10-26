/** Corre un día de la semana (1 = lunes … 7 = domingo) `by` días, dando la vuelta a la semana. */
export function shiftWeekday(weekday: number, by: number): number {
  return ((((weekday - 1 + by) % 7) + 7) % 7) + 1;
}
