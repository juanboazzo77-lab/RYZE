import type { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import { addDaysISO, isoToUtcDate, localTodayISO } from '@/lib/date';
import { ACTIVITY_DAYS } from '@/lib/sync/progress';
import type { AppData } from '@/lib/sync/data';

export type ProgressDb = Pick<PrismaClient, 'goal' | 'dailyActivity'>;

/** `db` tiene que venir acotada a la persona (`forUser`). */
export async function progressSnapshot(db: ProgressDb, timezone: string, now: Date): Promise<Pick<AppData, 'goal' | 'activity'>> {
  const since = addDaysISO(localTodayISO(timezone, DateTime.fromJSDate(now)), -(ACTIVITY_DAYS - 1));
  const goal = await db.goal.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: { startWeightKg: true, targetWeightKg: true },
  });
  const days = await db.dailyActivity.findMany({
    where: { date: { gte: isoToUtcDate(since) } },
    orderBy: { date: 'asc' },
    select: { date: true, steps: true, activeMinutes: true },
  });
  return { goal, activity: days.map((d) => ({ date: d.date.toISOString().slice(0, 10), steps: d.steps, activeMinutes: d.activeMinutes })) };
}
