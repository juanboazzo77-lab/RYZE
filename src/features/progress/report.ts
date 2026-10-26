import 'server-only';
import { DateTime } from 'luxon';
import type { Profile } from '@prisma/client';
import { forUser } from '@/server/user-db';
import { isoToUtcDate } from '@/lib/date';
import { nutritionAdherence } from '@/features/dashboard/compute';

export interface MonthlyReport {
  /** Mes en formato YYYY-MM. */
  month: string;
  workouts: number;
  activeDays: number;
  minutes: number;
  sets: number;
  /** Suma de peso × repeticiones de las series de trabajo completadas, en kg. */
  volumeKg: number;
  records: number;
  weight: { startKg: number; endKg: number; changeKg: number } | null;
  nutrition: { loggedDays: number; avgKcal: number; adherencePct: number | null };
  hasData: boolean;
}

/** Mes (YYYY-MM) válido y no futuro; si no, el mes actual en la zona de la persona. */
export function resolveMonth(raw: string | undefined, timezone: string): string {
  const current = DateTime.now().setZone(timezone).toFormat('yyyy-MM');
  if (!raw || !/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) return current;
  return raw > current ? current : raw;
}

export async function getMonthlyReport(profile: Profile, month: string): Promise<MonthlyReport> {
  const db = forUser(profile.id);
  const tz = profile.timezone;
  const start = DateTime.fromISO(`${month}-01`, { zone: tz }).startOf('month');
  const end = start.endOf('month');
  const startDate = isoToUtcDate(start.toISODate()!);
  const endDate = isoToUtcDate(end.toISODate()!);

  const [workouts, records, weights, foodByDay, target] = await db.$transaction([
    db.workout.findMany({
      where: { status: 'COMPLETED', finishedAt: { gte: start.toJSDate(), lte: end.toJSDate() } },
      select: {
        finishedAt: true,
        durationSeconds: true,
        exercises: {
          select: { sets: { select: { weightKg: true, reps: true, isCompleted: true, isWarmup: true } } },
        },
      },
      take: 200,
    }),
    db.personalRecord.count({ where: { achievedAt: { gte: start.toJSDate(), lte: end.toJSDate() } } }),
    db.weightEntry.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
      select: { weightKg: true },
    }),
    db.foodEntry.groupBy({
      by: ['date'],
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { kcal: true, proteinG: true },
      orderBy: { date: 'asc' },
    }),
    db.nutritionTarget.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      select: { kcal: true, proteinG: true },
    }),
  ]);

  const days = new Set<string>();
  let seconds = 0;
  let sets = 0;
  let volumeKg = 0;
  for (const w of workouts) {
    if (w.finishedAt) {
      const d = DateTime.fromJSDate(w.finishedAt).setZone(tz).toISODate();
      if (d) days.add(d);
    }
    seconds += w.durationSeconds ?? 0;
    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        if (!s.isCompleted || s.isWarmup) continue;
        sets += 1;
        volumeKg += (s.weightKg ?? 0) * (s.reps ?? 0);
      }
    }
  }

  const first = weights[0];
  const last = weights[weights.length - 1];
  const weight =
    first && last && weights.length >= 2
      ? {
          startKg: first.weightKg,
          endKg: last.weightKg,
          changeKg: Math.round((last.weightKg - first.weightKg) * 10) / 10,
        }
      : null;

  const dayTotals = foodByDay.map((d) => ({ kcal: d._sum.kcal ?? 0, proteinG: d._sum.proteinG ?? 0 }));
  const avgKcal = dayTotals.length
    ? Math.round(dayTotals.reduce((a, d) => a + d.kcal, 0) / dayTotals.length)
    : 0;
  const adherence = target
    ? nutritionAdherence(dayTotals, { kcal: target.kcal, proteinG: target.proteinG })
    : { pct: null as number | null };

  return {
    month,
    workouts: workouts.length,
    activeDays: days.size,
    minutes: Math.round(seconds / 60),
    sets,
    volumeKg: Math.round(volumeKg),
    records,
    weight,
    nutrition: { loggedDays: dayTotals.length, avgKcal, adherencePct: adherence.pct },
    hasData: workouts.length > 0 || dayTotals.length > 0 || weights.length > 0,
  };
}
