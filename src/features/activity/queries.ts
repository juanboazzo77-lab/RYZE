import 'server-only';
import type { Profile } from '@prisma/client';
import { forUser } from '@/server/user-db';
import { localTodayISO } from '@/lib/date';
import { averageSteps, type DaySteps } from '@/lib/activity/steps';

export interface ActivityView {
  todayISO: string;
  todaySteps: number | null;
  avg7: number | null;
  avg30: number | null;
  /** Últimos 30 días, más reciente al final, para el gráfico. */
  series: DaySteps[];
  recent: Array<{ date: string; steps: number; activeMinutes: number | null }>;
}

export async function getActivity(profile: Profile): Promise<ActivityView> {
  const db = forUser(profile.id);
  const todayISO = localTodayISO(profile.timezone);
  const fromDate = new Date(`${shift(todayISO, -29)}T00:00:00.000Z`);

  const rows = await db.dailyActivity.findMany({
    where: { date: { gte: fromDate } },
    orderBy: { date: 'asc' },
    select: { date: true, steps: true, activeMinutes: true },
  });

  const series: DaySteps[] = rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    steps: r.steps,
  }));

  return {
    todayISO,
    todaySteps: series.find((s) => s.date === todayISO)?.steps ?? null,
    avg7: averageSteps(series, todayISO, 7),
    avg30: averageSteps(series, todayISO, 30),
    series,
    recent: rows
      .slice(-7)
      .reverse()
      .map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        steps: r.steps,
        activeMinutes: r.activeMinutes,
      })),
  };
}

/** Promedio de pasos de la semana del check-in (para el reporte del Coach). */
export async function weeklyStepsAverage(
  profile: Profile,
  weekStartISO: string,
): Promise<number | null> {
  const db = forUser(profile.id);
  const start = new Date(`${weekStartISO}T00:00:00.000Z`);
  const end = new Date(`${shift(weekStartISO, 7)}T00:00:00.000Z`);
  const rows = await db.dailyActivity.findMany({
    where: { date: { gte: start, lt: end } },
    select: { steps: true },
  });
  if (rows.length === 0) return null;
  return Math.round(rows.reduce((s, r) => s + r.steps, 0) / rows.length);
}

function shift(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
