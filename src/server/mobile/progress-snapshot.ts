import type { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import { addDaysISO, isoToUtcDate, localTodayISO } from '@/lib/date';
import { STATS_WEEKS } from '@/lib/stats/compute';
import { ACTIVITY_DAYS } from '@/lib/sync/progress';
import { sessionVolume } from '@/lib/training/progress';
import type { AppData } from '@/lib/sync/data';

export type ProgressDb = Pick<PrismaClient, 'goal' | 'dailyActivity' | 'workout' | 'personalRecord' | 'achievement' | 'userAchievement'>;

const RECENT_RECORDS = 10;

/** Las últimas semanas (con un poco de margen), sólo con lo que usan las estadísticas. */
async function statsData(db: ProgressDb, now: Date): Promise<NonNullable<AppData['stats']>> {
  const since = new Date(now.getTime() - (STATS_WEEKS * 7 + 7) * 24 * 60 * 60 * 1000);
  const workouts = await db.workout.findMany({
    where: { status: 'COMPLETED', finishedAt: { gte: since } },
    select: { id: true, finishedAt: true, exercises: { select: { sets: { where: { isCompleted: true, isWarmup: false }, select: { weightKg: true, reps: true } } } } },
  });
  const records = await db.personalRecord.findMany({
    orderBy: { achievedAt: 'desc' },
    take: RECENT_RECORDS,
    select: { id: true, type: true, value: true, unit: true, achievedAt: true, exercise: { select: { name: true } } },
  });
  return {
    workouts: workouts.flatMap((w) =>
      w.finishedAt ? [{ id: w.id, finishedAt: w.finishedAt.toISOString(), volume: sessionVolume(w.exercises.flatMap((e) => e.sets)) }] : [],
    ),
    records: records.map(({ exercise, achievedAt, ...r }) => ({ ...r, exerciseName: exercise.name, achievedAt: achievedAt.toISOString() })),
  };
}

/** Los días con entrenamiento de todo el historial, para el calendario de constancia. */
async function trainedDays(db: ProgressDb, timezone: string): Promise<string[]> {
  const rows = await db.workout.findMany({ where: { status: 'COMPLETED', finishedAt: { not: null } }, select: { finishedAt: true } });
  const days = new Set<string>();
  for (const w of rows) {
    const day = w.finishedAt ? DateTime.fromJSDate(w.finishedAt).setZone(timezone).toISODate() : null;
    if (day) days.add(day);
  }
  return [...days].sort();
}

async function achievements(db: ProgressDb): Promise<NonNullable<AppData['achievements']>> {
  const catalog = await db.achievement.findMany({
    orderBy: { category: 'asc' },
    select: { key: true, category: true, title: true, description: true, icon: true, threshold: true },
  });
  const mine = await db.userAchievement.findMany({ select: { achievementKey: true, progress: true, unlockedAt: true } });
  const byKey = new Map(mine.map((m) => [m.achievementKey, m]));
  return catalog.map((a) => {
    const m = byKey.get(a.key);
    return { ...a, progress: m?.progress ?? 0, unlockedAt: m?.unlockedAt?.toISOString() ?? null };
  });
}

/** `db` tiene que venir acotada a la persona (`forUser`). */
export async function progressSnapshot(
  db: ProgressDb,
  timezone: string,
  now: Date,
): Promise<Pick<AppData, 'goal' | 'activity' | 'stats' | 'trainedDays' | 'achievements'>> {
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
  return {
    goal,
    activity: days.map((d) => ({ date: d.date.toISOString().slice(0, 10), steps: d.steps, activeMinutes: d.activeMinutes })),
    stats: await statsData(db, now),
    trainedDays: await trainedDays(db, timezone),
    achievements: await achievements(db),
  };
}
