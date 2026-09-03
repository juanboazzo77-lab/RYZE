import 'server-only';
import type { PrType } from '@prisma/client';
import type { UserDb } from '@/server/user-db';
import { sessionMetrics } from '@/lib/training/progress';

interface ExAgg {
  maxWeight: number;
  maxReps: number;
  volume: number;
  est1RM: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

const METRICS: Array<[PrType, (m: ExAgg) => number, string]> = [
  ['MAX_WEIGHT', (m) => m.maxWeight, 'kg'],
  ['MAX_REPS', (m) => m.maxReps, 'reps'],
  ['MAX_VOLUME', (m) => m.volume, 'kg'],
  ['EST_1RM', (m) => m.est1RM, 'kg'],
];

/**
 * Detecta récords personales de un entrenamiento recién completado y los
 * inserta en `personal_record`. Devuelve los tipos que superan un récord
 * anterior real (para celebrarlos); la primera vez de un ejercicio se guarda
 * como base sin devolverse.
 */
export async function detectAndRecordPrs(
  db: UserDb,
  userId: string,
  workoutId: string,
  achievedAt: Date,
): Promise<PrType[]> {
  const w = await db.workout.findFirst({
    where: { id: workoutId },
    select: {
      exercises: {
        select: {
          exerciseId: true,
          sets: {
            where: { isCompleted: true, isWarmup: false },
            select: { weightKg: true, reps: true },
          },
        },
      },
    },
  });
  if (!w) return [];

  const perEx = new Map<string, ExAgg>();
  for (const e of w.exercises) {
    if (e.sets.length === 0) continue;
    const m = sessionMetrics(e.sets);
    const prev = perEx.get(e.exerciseId);
    perEx.set(e.exerciseId, {
      maxWeight: Math.max(prev?.maxWeight ?? 0, m.topWeightKg),
      maxReps: Math.max(prev?.maxReps ?? 0, m.maxReps),
      volume: round1((prev?.volume ?? 0) + m.volume),
      est1RM: Math.max(prev?.est1RM ?? 0, m.est1RM),
    });
  }
  const exerciseIds = [...perEx.keys()];
  if (exerciseIds.length === 0) return [];

  const existing = await db.personalRecord.groupBy({
    by: ['exerciseId', 'type'],
    where: { exerciseId: { in: exerciseIds }, workoutId: { not: workoutId } },
    _max: { value: true },
  });
  const bestOf = new Map<string, number>();
  for (const g of existing) bestOf.set(`${g.exerciseId}|${g.type}`, g._max.value ?? 0);

  const rows: Array<{
    userId: string;
    exerciseId: string;
    type: PrType;
    value: number;
    unit: string;
    workoutId: string;
    achievedAt: Date;
  }> = [];
  const celebrated: PrType[] = [];

  for (const [exId, agg] of perEx) {
    for (const [type, get, unit] of METRICS) {
      const value = round1(get(agg));
      if (value <= 0) continue;
      const prevBest = bestOf.get(`${exId}|${type}`) ?? 0;
      if (value > prevBest + 1e-6) {
        rows.push({ userId, exerciseId: exId, type, value, unit, workoutId, achievedAt });
        if (prevBest > 0 && !celebrated.includes(type)) celebrated.push(type);
      }
    }
  }

  if (rows.length > 0) await db.personalRecord.createMany({ data: rows });
  return celebrated;
}
