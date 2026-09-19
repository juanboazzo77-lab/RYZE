import 'server-only';
import { DateTime } from 'luxon';
import type { UserDb } from '@/server/user-db';
import { workoutStreak } from '@/features/dashboard/compute';
import { addDaysISO, localTodayISO } from '@/lib/date';

/**
 * Progreso por logro.
 */
type Evaluator = (stats: Stats) => number;

interface Stats {
  workoutsCompleted: number;
  prCount: number;
  weightCount: number;
  foodCount: number;
  streakDays: number;
  proteinDays: number;
  cardioCount: number;
  checkinCount: number;
  aiPlanCount: number;
  goalReached: number;
}

const EVALUATORS: Record<string, Evaluator> = {
  first_workout: (s) => Math.min(s.workoutsCompleted, 1),
  workouts_10: (s) => Math.min(s.workoutsCompleted, 10),
  workouts_30: (s) => Math.min(s.workoutsCompleted, 30),
  workouts_50: (s) => Math.min(s.workoutsCompleted, 50),
  workouts_100: (s) => Math.min(s.workoutsCompleted, 100),
  first_pr: (s) => Math.min(s.prCount, 1),
  prs_5: (s) => Math.min(s.prCount, 5),
  prs_10: (s) => Math.min(s.prCount, 10),
  streak_7: (s) => Math.min(s.streakDays, 7),
  streak_30: (s) => Math.min(s.streakDays, 30),
  streak_60: (s) => Math.min(s.streakDays, 60),
  streak_100: (s) => Math.min(s.streakDays, 100),
  weight_log_30: (s) => Math.min(s.weightCount, 30),
  weight_log_90: (s) => Math.min(s.weightCount, 90),
  goal_reached: (s) => Math.min(s.goalReached, 1),
  first_meal_logged: (s) => Math.min(s.foodCount, 1),
  meals_100: (s) => Math.min(s.foodCount, 100),
  protein_goal_7: (s) => Math.min(s.proteinDays, 7),
  protein_goal_30: (s) => Math.min(s.proteinDays, 30),
  first_cardio: (s) => Math.min(s.cardioCount, 1),
  cardio_10: (s) => Math.min(s.cardioCount, 10),
  cardio_30: (s) => Math.min(s.cardioCount, 30),
  first_ai_plan: (s) => Math.min(s.aiPlanCount, 1),
  ai_plans_3: (s) => Math.min(s.aiPlanCount, 3),
  checkins_4: (s) => Math.min(s.checkinCount, 4),
  checkins_12: (s) => Math.min(s.checkinCount, 12),
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

    const [
      workoutsCompleted,
      prCount,
      weightCount,
      foodCount,
      completedDates,
      target,
      proteinByDay,
      cardioCount,
      checkinCount,
      aiPlanCount,
      activeGoal,
      latestWeight,
    ] = await db.$transaction([
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
      db.workoutSet.count({
        where: { isCompleted: true, workoutExercise: { exercise: { type: 'CARDIO' } } },
      }),
      db.weeklyCheckin.count({ where: { status: { not: 'DRAFT' } } }),
      db.workoutPlan.count({ where: { source: 'AI' } }),
      db.goal.findFirst({ where: { status: 'ACTIVE' }, select: { targetWeightKg: true } }),
      db.weightEntry.findFirst({ orderBy: { date: 'desc' }, select: { weightKg: true } }),
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

    const goalReached =
      activeGoal?.targetWeightKg != null && latestWeight?.weightKg != null
        ? Math.abs(latestWeight.weightKg - activeGoal.targetWeightKg) <= 0.5
          ? 1
          : 0
        : 0;

    const stats: Stats = {
      workoutsCompleted,
      prCount,
      weightCount,
      foodCount,
      streakDays,
      proteinDays,
      cardioCount,
      checkinCount,
      aiPlanCount,
      goalReached,
    };
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
