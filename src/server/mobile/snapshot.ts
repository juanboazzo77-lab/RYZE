import type { PrismaClient } from '@prisma/client';
import type { AppData } from '@/lib/sync/data';
import { PROTOCOL_VERSION, type Snapshot } from '@/lib/sync/protocol';

/** Algo más de un año de registros diarios. */
const MAX_WEIGHTS = 400;
/** Alcanza para saber qué se hizo esta semana en cualquier zona horaria, y la anterior. */
const RECENT_DAYS = 15;

export type SnapshotDb = Pick<PrismaClient, 'weightEntry' | 'profile' | 'workoutPlan' | 'workout'>;

/**
 * La foto de los datos que la app guarda para mostrarlos sin conexión. `db` tiene que venir acotada a la persona
 * (`forUser`); el perfil se pide por su propio id. Se elige campo por campo: nada de la base viaja por las dudas.
 */
export async function buildSnapshot(db: SnapshotDb, userId: string, now: Date): Promise<Snapshot> {
  const since = new Date(now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000);
  const [profile, weights, plan, recent] = await Promise.all([
    db.profile.findUnique({
      where: { id: userId },
      select: { name: true, email: true, timezone: true, unitSystem: true, weekStart: true, locale: true },
    }),
    db.weightEntry.findMany({
      orderBy: { date: 'desc' },
      take: MAX_WEIGHTS,
      select: { date: true, weightKg: true, note: true },
    }),
    db.workoutPlan.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        weekShift: true,
        weekShiftStart: true,
        days: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            name: true,
            weekday: true,
            exercises: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                exerciseId: true,
                targetSets: true,
                targetRepsMin: true,
                targetRepsMax: true,
                targetRir: true,
                restSeconds: true,
                targetDurationSec: true,
                targetDistanceMeters: true,
                notes: true,
                exercise: { select: { name: true, primaryMuscle: true, type: true } },
              },
            },
          },
        },
      },
    }),
    db.workout.findMany({
      where: { status: 'COMPLETED', planDayId: { not: null }, finishedAt: { gte: since } },
      select: { planDayId: true, finishedAt: true },
    }),
  ]);
  if (!profile) throw new Error('SIN_PERFIL');

  const data: AppData = {
    profile,
    weights: weights.map((w) => ({ date: w.date.toISOString().slice(0, 10), weightKg: w.weightKg, note: w.note })),
    training: {
      plan: plan
        ? {
            id: plan.id,
            name: plan.name,
            weekShift: plan.weekShift,
            weekShiftStart: plan.weekShiftStart ? plan.weekShiftStart.toISOString().slice(0, 10) : null,
            days: plan.days.map((d) => ({
              id: d.id,
              name: d.name,
              weekday: d.weekday,
              exercises: d.exercises.map(({ exercise, ...e }) => ({
                ...e,
                name: exercise.name,
                type: exercise.type,
                primaryMuscle: exercise.primaryMuscle,
              })),
            })),
          }
        : null,
      recentWorkouts: recent.flatMap((w) =>
        w.planDayId && w.finishedAt ? [{ planDayId: w.planDayId, finishedAt: w.finishedAt.toISOString() }] : [],
      ),
    },
  };
  return { protocol: PROTOCOL_VERSION, takenAt: now.toISOString(), data };
}
