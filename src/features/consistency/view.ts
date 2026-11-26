import { workoutStreak } from '@/features/dashboard/compute';
import { addDaysISO } from '@/lib/date';
import { buildYearGrid, longestStreak, yearsToShow, type DotCell, type YearGrid } from './grid';

/** Lo que necesita la pantalla de constancia. Lo usan la web y la app. */

/** Sin la fecha de cada punto, para no mandar datos de más al navegador. */
export type YearGridView = Omit<YearGrid, 'cells'> & { cells: Array<Pick<DotCell, 'col' | 'row' | 'state'>> };

export interface ConsistencyView {
  todayISO: string;
  streak: number;
  longest: number;
  /** Días distintos con entrenamiento, en todo el historial. */
  totalDays: number;
  /** Del año actual al más viejo con entrenamientos. */
  years: YearGridView[];
}

/** `trained`: los días (en la zona de la persona) en que terminó al menos un entrenamiento. */
export function consistencyView(trained: Set<string>, todayISO: string, weekStart: number): ConsistencyView {
  const years = yearsToShow(trained, todayISO).map((y) => {
    const g = buildYearGrid(y, trained, todayISO, weekStart);
    return { ...g, cells: g.cells.map(({ col, row, state }) => ({ col, row, state })) };
  });
  return { todayISO, streak: workoutStreak(trained, todayISO, addDaysISO), longest: longestStreak(trained), totalDays: trained.size, years };
}
