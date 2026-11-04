import 'server-only';
import { prisma } from './db';
import { trainerEditAccess } from './trainers';

/**
 * ¿De quién es la rutina que se está editando? Normalmente de quien edita. Si quien edita es el
 * ENTRENADOR de la dueña y ella le dio permiso de edición, se edita como si fuera ella (y los
 * datos se siguen acotando por el id de la dueña). En cualquier otro caso devuelve el id de quien
 * edita, y el chequeo de propiedad de cada acción corta el pedido como siempre.
 */
export async function planOwnerFor(
  editorId: string,
  ref: { planId?: string; dayId?: string; exerciseId?: string },
): Promise<string> {
  let ownerId: string | null | undefined;
  if (ref.planId) {
    ownerId = (await prisma.workoutPlan.findUnique({ where: { id: ref.planId }, select: { userId: true } }))?.userId;
  } else if (ref.dayId) {
    ownerId = (
      await prisma.planDay.findUnique({ where: { id: ref.dayId }, select: { plan: { select: { userId: true } } } })
    )?.plan.userId;
  } else if (ref.exerciseId) {
    ownerId = (
      await prisma.planExercise.findUnique({
        where: { id: ref.exerciseId },
        select: { planDay: { select: { plan: { select: { userId: true } } } } },
      })
    )?.planDay.plan.userId;
  }
  if (!ownerId || ownerId === editorId) return editorId;
  return (await trainerEditAccess(editorId, ownerId)) ? ownerId : editorId;
}
