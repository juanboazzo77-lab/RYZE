import { addDaysISO } from '@/lib/date';
import { averageSteps, type DaySteps } from './steps';

/** Lo que muestra la tarjeta de actividad, a partir de los días registrados. Lo usan la web y la app. */

export interface ActivityDay {
  /** yyyy-mm-dd */
  date: string;
  steps: number;
  activeMinutes: number | null;
}

export interface ActivityView {
  todayISO: string;
  todaySteps: number | null;
  avg7: number | null;
  avg30: number | null;
  /** Últimos 30 días, más reciente al final, para el gráfico. */
  series: DaySteps[];
  recent: ActivityDay[];
}

/** `days` del más viejo al más nuevo; los de antes de los últimos 30 días no cuentan. */
export function activityView(days: ActivityDay[], todayISO: string): ActivityView {
  const from = addDaysISO(todayISO, -29);
  const rows = days.filter((d) => d.date >= from);
  const series: DaySteps[] = rows.map((r) => ({ date: r.date, steps: r.steps }));
  return {
    todayISO,
    todaySteps: series.find((s) => s.date === todayISO)?.steps ?? null,
    avg7: averageSteps(series, todayISO, 7),
    avg30: averageSteps(series, todayISO, 30),
    series,
    recent: rows.slice(-7).reverse(),
  };
}
