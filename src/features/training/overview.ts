import { activeWeekShift, doneWeekdays, weekdayThisWeek } from './weekday';

/**
 * Cómo quedan los días de la rutina ESTA semana (en qué día cae cada uno y cuáles ya se hicieron). Sin base de datos:
 * la usan la web (en el servidor) y la app independiente (en el teléfono, también sin señal), así dan lo mismo.
 */

export interface OverviewDay {
  id: string;
  name: string;
  weekday: number | null;
  exerciseCount: number;
  /** Ya se completó este día de la rutina en la semana en curso (vuelve a false al empezar la semana siguiente). */
  done: boolean;
}

export interface OverviewPlanInput {
  weekShift: number;
  weekShiftStart: Date | null;
  days: Array<{ id: string; name: string; weekday: number | null; exerciseCount: number }>;
}

export function overviewDays(
  plan: OverviewPlanInput,
  doneRows: Array<{ planDayId: string | null; finishedAt: Date | null }>,
  timezone: string,
  /** Inicio (yyyy-mm-dd) de la semana en curso, según la persona. */
  currentWeekStartISO: string,
): OverviewDay[] {
  const shift = activeWeekShift(plan, currentWeekStartISO);
  const done = doneWeekdays(doneRows, timezone, currentWeekStartISO);
  return plan.days.map((d) => ({
    id: d.id,
    name: d.name,
    weekday: weekdayThisWeek(d, shift, done),
    exerciseCount: d.exerciseCount,
    done: done.has(d.id),
  }));
}
