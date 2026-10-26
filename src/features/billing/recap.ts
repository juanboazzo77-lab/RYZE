import 'server-only';
import type { Profile } from '@prisma/client';
import { forUser } from '@/server/user-db';

export interface TrialRecap {
  workouts: number;
  meals: number;
  coachMessages: number;
  records: number;
  /** Cambio de peso desde el alta, en kg (null si hay menos de dos registros). */
  weightChangeKg: number | null;
}

/** Lo que la persona hizo en la app desde que se registró: se muestra en la pantalla de planes. */
export async function getTrialRecap(profile: Profile): Promise<TrialRecap> {
  const db = forUser(profile.id);
  const since = profile.createdAt;
  const [workouts, meals, records, usage, firstW, lastW] = await db.$transaction([
    db.workout.count({ where: { status: 'COMPLETED', finishedAt: { gte: since } } }),
    db.foodEntry.count({ where: { createdAt: { gte: since } } }),
    db.personalRecord.count({ where: { createdAt: { gte: since } } }),
    db.aiUsageDaily.aggregate({
      where: { task: 'coach_chat', day: { gte: new Date(since.toISOString().slice(0, 10)) } },
      _sum: { messageCount: true },
    }),
    db.weightEntry.findFirst({ orderBy: { date: 'asc' }, select: { weightKg: true, date: true } }),
    db.weightEntry.findFirst({ orderBy: { date: 'desc' }, select: { weightKg: true, date: true } }),
  ]);
  const weightChangeKg =
    firstW && lastW && firstW.date.getTime() !== lastW.date.getTime()
      ? Math.round((lastW.weightKg - firstW.weightKg) * 10) / 10
      : null;
  return {
    workouts,
    meals,
    coachMessages: usage._sum.messageCount ?? 0,
    records,
    weightChangeKg,
  };
}
