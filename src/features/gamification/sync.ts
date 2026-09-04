import 'server-only';
import { DateTime } from 'luxon';
import type { UserDb } from '@/server/user-db';
import { workoutStreak } from '@/features/dashboard/compute';
import { addDaysISO, localTodayISO } from '@/lib/date';

/**
 * Progreso por logro. `first_ai_plan` no tiene evaluador todavía (Fase 9):
 * queda tal cual esté en la DB.
 */
type Evaluator = (stats: Stats) => number;

interface Stats {
  workoutsCompleted: number;
  prCount: number;
  weightCount: number;
  foodCount: number;
  streakDays: number;
  proteinDays: number;
}

const EVALUATORS: Record<string, Evaluator> = {
  first_workout: (s) => Math.min(s.workoutsCompleted, 1),
  workouts_10: (s) => Math.min(s.workoutsCompleted, 10),
  workouts_30: (s) => Math.min(s.workoutsCompleted, 30),
  first_pr: (s) => Math.min(s.prCount, 1),
  streak_7: (s) => Math.min(s.streakDays, 7),
  streak_30: (s) => Math.min(s.streakDays, 30),
  weight_log_30: (s) => Math.min(s.weightCount, 30),
  first_meal_logged: (s) => Math.min(s.foodCount, 1),
  protein_goal_7: (s) => Math.min(s.proteinDays, 7),
};

/**
 * Recalcula el progreso de los logros con evaluador y desbloquea los que
 * llegaron al umbral. Nunca lanza: una falla acá no debe romper la acción
 * que la disparó (terminar un entreno, registrar peso/comida).
 */
export async function syncAchievements(db: UserDb, userId: string, timezone: string): Promise<void> {
  try {
    const todayISO = localTodayISO(timezone);
    const since120 = addDaysISO(todayISO, -120);
    const sinceDate = new Date(`${since120}T00:00:00Z`);

    const [workoutsCompleted, prCount, weightCount, foodCount, completedDates, target, proteinByDay] =
      await db.$transaction([
        db.workout.count({ where: { status: 'COMPLETED' } }),
        db.personalRecord.count(),
        db.weightEntry.count(),
        db.foodEntry.count(),
        db.workout.findMany({
          where: { status: 'COMPLETED', finishedAt: { not: null } },
          orderBy: { finishedAt: 'desc' },
          take: 120,
          select: { finishedAt: true },
        }),
        db.nutritionTarget.findFirst({ where: { active: true }, select: { proteinG: true } }),
        db.foodEntry.groupBy({
          by: ['date'],
          where: { date: { gte: sinceDate } },
          _sum: { proteinG: true },
        }),
      ]);

    const completedDays = new Set(
      completedDates
        .map((w) => (w.finishedAt ? DateTime.fromJSDate(w.finishedAt).setZone(timezone).toISODate() : null))
        .filter((d): d is string => Boolean(d)),
    );
    const streakDays = workoutStreak(completedDays, todayISO, addDaysISO);
    const proteinDays = target
      ? proteinByDay.filter((d) => (d._sum.proteinG ?? 0) >= target.proteinG * 0.9).length
      : 0;

    const stats: Stats = { workoutsCompleted, prCount, weightCount, foodCount, streakDays, proteinDays };
    const keys = Object.keys(EVALUATORS);

    const existing = await db.userAchievement.findMany({
      where: { achievementKey: { in: keys } },
      select: { achievementKey: true, progress: true, unlockedAt: true },
    });
    const byKey = new Map(existing.map((e) => [e.achievementKey, e]));

    const catalog = await db.achievement.findMany({
      where: { key: { in: keys } },
      select: { key: true, threshold: true },
    });
    const thresholdOf = new Map(catalog.map((a) => [a.key, a.threshold ?? 0]));

    const ops = [];
    for (const key of keys) {
      const progress = EVALUATORS[key]!(stats);
      const prev = byKey.get(key);
      const threshold = thresholdOf.get(key) ?? 0;
      const wasUnlocked = Boolean(prev?.unlockedAt);
      const nowUnlocked = !wasUnlocked && threshold > 0 && progress >= threshold;

      if (!prev) {
        if (progress > 0) {
          ops.push(
            db.userAchievement.create({
              data: {
                userId,
                achievementKey: key,
                progress,
                unlockedAt: nowUnlocked ? new Date() : null,
              },
            }),
          );
        }
      } else if (progress > prev.progress || nowUnlocked) {
        ops.push(
          db.userAchievement.updateMany({
            where: { achievementKey: key },
            data: { progress, ...(nowUnlocked ? { unlockedAt: new Date() } : {}) },
          }),
        );
      }
    }

    if (ops.length > 0) await db.$transaction(ops);
  } catch {
    // Los logros nunca deben bloquear la acción principal.
  }
}
