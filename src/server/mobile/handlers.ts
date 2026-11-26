import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { completedWorkoutSchema, WORKOUT_OP } from '@/lib/sync/workout';
import { prefsSchema, PREFS_OP } from '@/lib/sync/data';
import { buildFoodHandlers } from './food-handlers';
import { buildProgressHandlers } from './progress-handlers';
import { checkDay } from './check-day';
import { RejectedOperation, type Handler } from './apply';

/**
 * Un manejador por cada cosa que la app puede subir. Reciben la base YA acotada a la persona (`forUser`), así que
 * nada de lo que mande el teléfono puede tocar datos de otra cuenta. Todo lo que llega se valida como si viniera de
 * cualquiera.
 */

export type MobileTx = Pick<PrismaClient, 'weightEntry' | 'syncOp' | 'workout' | 'workoutPlan' | 'exercise' | 'food' | 'foodEntry' | 'dailyActivity' | 'profile'>;

const MAX_DURATION_SECONDS = 24 * 60 * 60;

const weightSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.number().min(20).max(500),
  note: z.string().trim().max(200).optional(),
});

export function buildHandlers({ userId, timezone }: { userId: string; timezone: string }): Record<string, Handler<MobileTx>> {
  return {
    ...buildFoodHandlers({ userId, timezone }),
    ...buildProgressHandlers({ userId, timezone }),

    /** Idioma y unidades. El perfil no pasa por el acotado por usuario: se usa siempre el id de la sesión. */
    [PREFS_OP]: async (tx, { payload, at }) => {
      const p = prefsSchema.safeParse(payload);
      if (!p.success) throw new RejectedOperation('INVALID');
      const current = await tx.profile.findUnique({ where: { id: userId }, select: { prefsEditedAt: true } });
      if (!current || (current.prefsEditedAt && current.prefsEditedAt.getTime() > at.getTime())) return;
      await tx.profile.update({ where: { id: userId }, data: { ...p.data, prefsEditedAt: at } });
    },

    /** Un entrenamiento terminado en la app, entero. */
    [WORKOUT_OP]: async (tx, { payload, at }) => {
      const p = completedWorkoutSchema.safeParse(payload);
      if (!p.success) throw new RejectedOperation('INVALID');
      const w = p.data;

      // Ya está guardado (la app lo mandó dos veces, por ejemplo tras cerrarse justo al terminar): no se duplica.
      if (await tx.workout.findFirst({ where: { id: w.workoutId }, select: { id: true } })) return;

      // Todos los ejercicios tienen que existir, y los propios de otra persona sólo valen si están en una rutina mía.
      const wanted = [...new Set(w.exercises.map((e) => e.exerciseId))];
      const known = await tx.exercise.findMany({ where: { id: { in: wanted } }, select: { id: true, isCustom: true, createdById: true } });
      if (known.length !== wanted.length) throw new RejectedOperation('UNKNOWN_EXERCISE');
      for (const e of known.filter((x) => x.isCustom && x.createdById !== userId)) {
        const mine = await tx.workoutPlan.findFirst({ where: { days: { some: { exercises: { some: { exerciseId: e.id } } } } }, select: { id: true } });
        if (!mine) throw new RejectedOperation('UNKNOWN_EXERCISE');
      }

      // Si la rutina se borró o cambió mientras no había señal, el entrenamiento se guarda igual, sin vincularlo.
      const plan = w.planDayId
        ? await tx.workoutPlan.findFirst({ where: { days: { some: { id: w.planDayId } } }, select: { id: true } })
        : null;

      const finishedAt = new Date(Math.min(Date.parse(w.finishedAt), at.getTime()));
      const startedAt = new Date(Math.min(Date.parse(w.startedAt), finishedAt.getTime()));
      const durationSeconds = Math.min(MAX_DURATION_SECONDS, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000));

      try {
        await tx.workout.create({
          data: {
            id: w.workoutId,
            userId,
            planId: plan?.id ?? null,
            planDayId: plan ? w.planDayId : null,
            name: w.name,
            status: 'COMPLETED',
            startedAt,
            finishedAt,
            durationSeconds,
            perceivedEffort: w.perceivedEffort,
            exercises: {
              create: w.exercises.map((e, orderIndex) => ({
                id: e.id,
                exerciseId: e.exerciseId,
                orderIndex,
                targetRepsMin: e.targetRepsMin,
                targetRepsMax: e.targetRepsMax,
                targetRir: e.targetRir,
                restSeconds: e.restSeconds,
                targetDurationSec: e.targetDurationSec,
                targetDistanceMeters: e.targetDistanceMeters,
                notes: e.notes,
                sets: { create: e.sets.map((s) => ({ ...s, completedAt: s.isCompleted ? finishedAt : null })) },
              })),
            },
          },
        });
      } catch (err) {
        // Un identificador que ya usa otro registro: no se va a poder guardar nunca.
        if ((err as { code?: string }).code === 'P2002') throw new RejectedOperation('CONFLICT');
        throw err;
      }
    },

    /** El peso de un día (hay uno por fecha). */
    'weight.log': async (tx, { payload, at }) => {
      const p = weightSchema.safeParse(payload);
      if (!p.success) throw new RejectedOperation('INVALID');
      const date = checkDay(p.data.date, at, timezone);
      const values = { weightKg: p.data.weightKg, note: p.data.note || null, editedAt: at };

      const current = await tx.weightEntry.findFirst({ where: { date }, select: { id: true, editedAt: true, updatedAt: true } });
      if (!current) {
        await tx.weightEntry.create({ data: { userId, date, ...values } });
        return;
      }
      // Gana el cambio hecho más tarde: si después de esto se corrigió (por ejemplo en la web), no se pisa.
      if ((current.editedAt ?? current.updatedAt).getTime() > at.getTime()) return;
      await tx.weightEntry.updateMany({ where: { id: current.id }, data: values });
    },
  };
}
