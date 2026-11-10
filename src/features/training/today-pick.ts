/**
 * Qué día de la rutina destacar arriba de todo ("Hoy te toca"). Función pura.
 * - Si hay un día asignado a hoy (weekday = 1 lunes … 7 domingo), ese.
 * - Si no, el próximo día de la semana que tenga un día asignado (dando la vuelta a la semana).
 * - Si ningún día tiene fecha asignada, el primero de la rutina.
 */
export interface PickableDay {
  id: string;
  weekday: number | null;
}

export function pickHeroDay<T extends PickableDay>(days: T[], todayWeekday: number): { day: T; isToday: boolean } | null {
  if (days.length === 0) return null;
  const today = days.find((d) => d.weekday === todayWeekday);
  if (today) return { day: today, isToday: true };
  let best: { day: T; ahead: number } | null = null;
  for (const d of days) {
    if (!d.weekday) continue;
    const ahead = (d.weekday - todayWeekday + 7) % 7;
    if (ahead > 0 && (!best || ahead < best.ahead)) best = { day: d, ahead };
  }
  if (best) return { day: best.day, isToday: false };
  return { day: days[0]!, isToday: false };
}
