/**
 * Los números de Estadísticas. Los usan la web y la app (sin señal se ven iguales, incluso con lo que no se subió).
 */
import { DateTime } from 'luxon';
import { nutritionAdherence } from '@/features/dashboard/compute';
import { addDaysISO, localTodayISO, weekStartISO } from '@/lib/date';

export const STATS_WEEKS = 8;

export interface WeeklyPoint {
  weekStartISO: string;
  label: string;
  workouts: number;
  volume: number;
}

export interface StatsNumbers {
  weeks: WeeklyPoint[];
  avgKcal: number | null;
  avgProtein: number | null;
  adherencePct: number | null;
  loggedDays: number;
}

export function computeStats({
  workouts,
  foodByDay,
  target,
  timezone,
  weekStart,
  now,
  weeksCount = STATS_WEEKS,
}: {
  workouts: Array<{ finishedAt: string; volume: number }>;
  /** Un renglón por día con comidas, de los últimos 30 días. */
  foodByDay: Array<{ kcal: number; proteinG: number }>;
  target: { kcal: number; proteinG: number } | null;
  timezone: string;
  weekStart: number;
  now: Date;
  weeksCount?: number;
}): StatsNumbers {
  // La semana de cada entrenamiento sale de su día EN LA ZONA de la persona (un domingo a la noche es de esa semana).
  const buckets = new Map<string, { workouts: number; volume: number }>();
  for (const w of workouts) {
    const day = DateTime.fromISO(w.finishedAt).setZone(timezone).toISODate();
    if (!day) continue;
    const key = weekStartISO(day, weekStart);
    const b = buckets.get(key) ?? { workouts: 0, volume: 0 };
    b.workouts += 1;
    b.volume += w.volume;
    buckets.set(key, b);
  }

  const currentWeek = weekStartISO(localTodayISO(timezone, DateTime.fromJSDate(now)), weekStart);
  const weeks: WeeklyPoint[] = [];
  for (let i = weeksCount - 1; i >= 0; i--) {
    const key = addDaysISO(currentWeek, -7 * i);
    const b = buckets.get(key) ?? { workouts: 0, volume: 0 };
    weeks.push({ weekStartISO: key, label: key.slice(5).replace('-', '/'), workouts: b.workouts, volume: Math.round(b.volume) });
  }

  const average = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);
  const adherence = target ? nutritionAdherence(foodByDay, target) : { pct: null };

  return {
    weeks,
    avgKcal: average(foodByDay.map((d) => d.kcal).filter((v) => v > 0)),
    avgProtein: average(foodByDay.map((d) => d.proteinG).filter((v) => v > 0)),
    adherencePct: adherence.pct,
    loggedDays: foodByDay.length,
  };
}
