import 'server-only';
import { DateTime } from 'luxon';
import type { Profile, WorkoutStatus } from '@prisma/client';
import { forUser } from '@/server/user-db';

export interface CalendarDay {
  dateISO: string;
  workout: { id: string; name: string; status: WorkoutStatus } | null;
  weightKg: number | null;
  nutrition: { kcal: number; targetKcal: number | null } | null;
  checkinId: string | null;
}

export interface CalendarMonth {
  monthISO: string; // yyyy-mm
  days: CalendarDay[];
  leadingBlanks: number; // celdas vacías antes del día 1 (según weekStart)
}

const STATUS_PRIORITY: Record<WorkoutStatus, number> = {
  COMPLETED: 3,
  ACTIVE: 2,
  PENDING: 1,
  SKIPPED: 0,
};

export async function getCalendarMonth(profile: Profile, monthISO: string): Promise<CalendarMonth> {
  const db = forUser(profile.id);
  const start = DateTime.fromISO(`${monthISO}-01`, { zone: 'utc' });
  const end = start.endOf('month');
  const startDate = start.toJSDate();
  const endDate = end.toJSDate();
  const endExclusive = end.plus({ days: 1 }).toJSDate();

  const [workouts, weights, foodByDay, target, checkins] = await db.$transaction([
    db.workout.findMany({
      where: {
        OR: [
          { scheduledFor: { gte: startDate, lte: endDate } },
          { startedAt: { gte: startDate, lt: endExclusive } },
          { finishedAt: { gte: startDate, lt: endExclusive } },
        ],
      },
      select: { id: true, name: true, status: true, scheduledFor: true, startedAt: true, finishedAt: true },
    }),
    db.weightEntry.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { date: true, weightKg: true },
    }),
    db.foodEntry.groupBy({
      by: ['date'],
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { kcal: true },
    }),
    db.nutritionTarget.findFirst({ where: { active: true }, select: { kcal: true } }),
    db.weeklyCheckin.findMany({
      where: { weekStart: { gte: startDate, lte: endDate } },
      select: { id: true, weekStart: true },
    }),
  ]);

  const byDate = new Map<string, CalendarDay>();
  const get = (iso: string): CalendarDay => {
    let d = byDate.get(iso);
    if (!d) {
      d = { dateISO: iso, workout: null, weightKg: null, nutrition: null, checkinId: null };
      byDate.set(iso, d);
    }
    return d;
  };

  for (const w of workouts) {
    const iso = (w.finishedAt ?? w.startedAt ?? w.scheduledFor)?.toISOString().slice(0, 10);
    if (!iso) continue;
    const day = get(iso);
    if (!day.workout || STATUS_PRIORITY[w.status] > STATUS_PRIORITY[day.workout.status]) {
      day.workout = { id: w.id, name: w.name, status: w.status };
    }
  }
  for (const w of weights) {
    get(w.date.toISOString().slice(0, 10)).weightKg = w.weightKg;
  }
  for (const f of foodByDay) {
    const kcal = f._sum.kcal ?? 0;
    if (kcal > 0) get(f.date.toISOString().slice(0, 10)).nutrition = { kcal: Math.round(kcal), targetKcal: target?.kcal ?? null };
  }
  for (const c of checkins) {
    get(c.weekStart.toISOString().slice(0, 10)).checkinId = c.id;
  }

  const days: CalendarDay[] = [];
  for (let d = start; d <= end; d = d.plus({ days: 1 })) {
    const iso = d.toISODate()!;
    days.push(byDate.get(iso) ?? { dateISO: iso, workout: null, weightKg: null, nutrition: null, checkinId: null });
  }

  // luxon weekday: 1=lunes..7=domingo. Convertimos a offset relativo a profile.weekStart.
  const firstWeekday = start.weekday;
  const leadingBlanks = (firstWeekday - profile.weekStart + 7) % 7;

  return { monthISO, days, leadingBlanks };
}
