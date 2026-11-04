import 'server-only';
import { prisma } from './db';
import { forUser } from './user-db';
import { isoToUtcDate } from '@/lib/date';
import { sendMessage, type SendError } from './trainer-chat';
import type { ContactReason } from '@/features/trainer/contact-filter';
import { trainerEditAccess } from './trainers';

/**
 * Seguimiento 1 a 1 del entrenador con un cliente (notas privadas, próxima fecha, feedback de las
 * revisiones) y armado de la rutina y la dieta. Todo pasa por un vínculo ACTIVO con el entrenador
 * aprobado; armar rutina y dieta exige además el permiso de edición que dio el cliente.
 */

const isoOf = (d: Date) => d.toISOString().slice(0, 10);
export const MAX_NOTE_LEN = 2000;
/** El feedback viaja como mensaje del chat, que tiene tope de 1000 caracteres. */
export const MAX_FEEDBACK_LEN = 850;
const MAX_NOTES = 200;

interface ActiveLink {
  id: string;
  trainerName: string;
}

/** El vínculo activo (con el entrenador aprobado) entre los dos, o null. */
async function activeLink(trainerId: string, clientId: string): Promise<ActiveLink | null> {
  const link = await prisma.trainerClient.findFirst({
    where: { trainerId, clientId, status: 'ACTIVE', trainer: { status: 'ACTIVE' } },
    select: { id: true, trainer: { select: { displayName: true } } },
  });
  return link ? { id: link.id, trainerName: link.trainer.displayName } : null;
}

export interface FollowUpNote {
  id: string;
  body: string;
  createdAt: string;
}

export interface FollowUpView {
  nextFollowUp: string | null;
  notes: FollowUpNote[];
  /** Feedback ya enviado, por revisión semanal. */
  feedbackByCheckin: Record<string, string>;
}

export async function getFollowUp(trainerId: string, clientId: string): Promise<FollowUpView | null> {
  const link = await prisma.trainerClient.findFirst({
    where: { trainerId, clientId, status: 'ACTIVE', trainer: { status: 'ACTIVE' } },
    select: { id: true, nextFollowUp: true },
  });
  if (!link) return null;
  const rows = await prisma.trainerNote.findMany({
    where: { linkId: link.id },
    orderBy: { createdAt: 'desc' },
    take: MAX_NOTES,
    select: { id: true, kind: true, checkinId: true, body: true, createdAt: true },
  });
  const feedbackByCheckin: Record<string, string> = {};
  const notes: FollowUpNote[] = [];
  for (const r of rows) {
    if (r.kind === 'FEEDBACK' && r.checkinId) {
      // Si hubo más de un feedback, queda el más reciente.
      feedbackByCheckin[r.checkinId] ??= r.body;
    } else if (r.kind === 'NOTE') {
      notes.push({ id: r.id, body: r.body, createdAt: r.createdAt.toISOString() });
    }
  }
  return { nextFollowUp: link.nextFollowUp ? isoOf(link.nextFollowUp) : null, notes, feedbackByCheckin };
}

export async function addNote(trainerId: string, clientId: string, rawBody: string): Promise<boolean> {
  const body = rawBody.trim();
  if (body.length < 1 || body.length > MAX_NOTE_LEN) return false;
  const link = await activeLink(trainerId, clientId);
  if (!link) return false;
  await prisma.trainerNote.create({ data: { linkId: link.id, authorId: trainerId, kind: 'NOTE', body } });
  return true;
}

export async function deleteNote(trainerId: string, noteId: string): Promise<boolean> {
  // Sólo borra notas de vínculos del propio entrenador.
  const res = await prisma.trainerNote.deleteMany({
    where: { id: noteId, kind: 'NOTE', link: { trainerId, status: 'ACTIVE', trainer: { status: 'ACTIVE' } } },
  });
  return res.count > 0;
}

export async function setNextFollowUp(trainerId: string, clientId: string, iso: string | null): Promise<boolean> {
  if (iso !== null && !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const res = await prisma.trainerClient.updateMany({
    where: { trainerId, clientId, status: 'ACTIVE', trainer: { status: 'ACTIVE' } },
    data: { nextFollowUp: iso ? isoToUtcDate(iso) : null },
  });
  return res.count > 0;
}

export type FeedbackResult =
  | { ok: true }
  | { error: SendError | 'INVALID' | 'NOT_LINKED' | 'NOT_FOUND'; reason?: ContactReason };

/**
 * Feedback del entrenador a una revisión semanal: le llega al cliente como mensaje del chat (pasa
 * por el mismo filtro de contactos) y queda anotado en el seguimiento.
 */
export async function sendCheckinFeedback(
  trainerId: string,
  clientId: string,
  checkinId: string,
  rawBody: string,
): Promise<FeedbackResult> {
  const body = rawBody.trim();
  if (body.length < 1 || body.length > MAX_FEEDBACK_LEN) return { error: 'INVALID' };
  const link = await activeLink(trainerId, clientId);
  if (!link) return { error: 'NOT_LINKED' };
  const checkin = await prisma.weeklyCheckin.findFirst({
    where: { id: checkinId, userId: clientId },
    select: { weekStart: true },
  });
  if (!checkin) return { error: 'NOT_FOUND' };

  const when = checkin.weekStart.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const sent = await sendMessage(trainerId, link.id, `📝 Feedback de tu revisión (semana del ${when}):\n${body}`);
  if ('error' in sent) return { error: sent.error, reason: sent.reason };
  await prisma.trainerNote.create({
    data: { linkId: link.id, authorId: trainerId, kind: 'FEEDBACK', checkinId, body },
  });
  return { ok: true };
}

/** Aviso en el chat de que el entrenador actualizó algo del plan. */
export async function notifyClientUpdate(
  trainerId: string,
  clientId: string,
  what: 'routine' | 'diet',
): Promise<FeedbackResult> {
  const link = await activeLink(trainerId, clientId);
  if (!link) return { error: 'NOT_LINKED' };
  const text =
    what === 'routine'
      ? '✅ Actualicé tu rutina. Fijate en la pestaña Entrenar.'
      : '✅ Actualicé tus objetivos de nutrición. Fijate en la pestaña Nutrición.';
  const sent = await sendMessage(trainerId, link.id, text);
  return 'error' in sent ? { error: sent.error } : { ok: true };
}

/* ------------------------------------------------------------------ */
/* Rutina y dieta del cliente (exige el permiso de edición)            */
/* ------------------------------------------------------------------ */

export interface ClientPlanRow {
  id: string;
  name: string;
  isActive: boolean;
  days: number;
}

export async function listClientPlans(trainerId: string, clientId: string): Promise<ClientPlanRow[] | null> {
  if (!(await trainerEditAccess(trainerId, clientId))) return null;
  const plans = await forUser(clientId).workoutPlan.findMany({
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    take: 20,
    select: { id: true, name: true, isActive: true, _count: { select: { days: true } } },
  });
  return plans.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive, days: p._count.days }));
}

/** Crea una rutina vacía para el cliente (queda sin activar hasta que el entrenador la termine). */
export async function createClientPlan(trainerId: string, clientId: string, name: string): Promise<string | null> {
  if (!(await trainerEditAccess(trainerId, clientId))) return null;
  const trainer = await prisma.trainerProfile.findUnique({ where: { userId: trainerId }, select: { displayName: true } });
  const plan = await forUser(clientId).workoutPlan.create({
    data: {
      userId: clientId,
      name: name.trim().slice(0, 60),
      description: `Creada por tu entrenador ${trainer?.displayName ?? ''}`.trim().slice(0, 300),
      source: 'MANUAL',
      isActive: false,
    },
    select: { id: true },
  });
  return plan.id;
}

export interface NutritionTargetInput {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  note?: string;
}

/** Define los objetivos de nutrición del cliente (el anterior queda desactivado). */
export async function setClientNutritionTarget(
  trainerId: string,
  clientId: string,
  input: NutritionTargetInput,
): Promise<boolean> {
  if (!(await trainerEditAccess(trainerId, clientId))) return false;
  const trainer = await prisma.trainerProfile.findUnique({ where: { userId: trainerId }, select: { displayName: true } });
  const db = forUser(clientId);
  await db.nutritionTarget.updateMany({ where: { active: true }, data: { active: false } });
  await db.nutritionTarget.create({
    data: {
      userId: clientId,
      effectiveFrom: new Date(),
      kcal: input.kcal,
      proteinG: input.proteinG,
      carbsG: input.carbsG,
      fatG: input.fatG,
      source: 'MANUAL',
      active: true,
      rationale:
        `Definido por tu entrenador ${trainer?.displayName ?? ''}.${input.note ? ` ${input.note.trim()}` : ''}`.slice(0, 500),
    },
  });
  return true;
}
