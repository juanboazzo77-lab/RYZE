import 'server-only';
import { DateTime } from 'luxon';
import type { Profile } from '@prisma/client';
import { forUser } from '@/server/user-db';
import { addDaysISO, localTodayISO } from '@/lib/date';
import { workoutStreak } from '@/features/dashboard/compute';
import { buildYearGrid, longestStreak, yearsToShow, type DotCell, type YearGrid } from './grid';

/** Lo que necesita la pantalla en el navegador: sin la fecha de cada punto, para no mandar datos de más. */
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

/** Los días (en la zona horaria de la persona) en que terminó al menos un entrenamiento. */
export async function getConsistency(profile: Profile): Promise<ConsistencyView> {
  const db = forUser(profile.id);
  const todayISO = localTodayISO(profile.timezone);
  const rows = await db.workout.findMany({
    where: { status: 'COMPLETED', finishedAt: { not: null } },
    select: { finishedAt: true },
  });

  const trained = new Set<string>();
  for (const w of rows) {
    if (!w.finishedAt) continue;
    const iso = DateTime.fromJSDate(w.finishedAt).setZone(profile.timezone).toISODate();
    if (iso) trained.add(iso);
  }

  const years = yearsToShow(trained, todayISO).map((y) => {
    const g = buildYearGrid(y, trained, todayISO, profile.weekStart);
    return { ...g, cells: g.cells.map(({ col, row, state }) => ({ col, row, state })) };
  });

  return {
    todayISO,
    streak: workoutStreak(trained, todayISO, addDaysISO),
    longest: longestStreak(trained),
    totalDays: trained.size,
    years,
  };
}
