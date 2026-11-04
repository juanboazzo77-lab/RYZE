'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import {
  addNote,
  createClientPlan,
  deleteNote,
  notifyClientUpdate,
  sendCheckinFeedback,
  setClientNutritionTarget,
  setNextFollowUp,
  MAX_FEEDBACK_LEN,
  MAX_NOTE_LEN,
} from '@/server/trainer-followup';
import type { ContactReason } from './contact-filter';

interface Result<T = void> {
  ok?: boolean;
  error?: string;
  reason?: ContactReason;
  data?: T;
}

const uuid = z.string().uuid();

function refreshClient(clientId: string) {
  revalidatePath(`/trainer/clients/${clientId}`);
}

/* --- Seguimiento 1 a 1 --- */

export async function addTrainerNote(raw: { clientId: string; body: string }): Promise<Result> {
  const id = uuid.safeParse(raw.clientId);
  const body = z.string().trim().min(1).max(MAX_NOTE_LEN).safeParse(raw.body);
  if (!id.success || !body.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const ok = await addNote(userId, id.data, body.data);
  refreshClient(id.data);
  return ok ? { ok: true } : { error: 'NOT_AVAILABLE' };
}

export async function removeTrainerNote(raw: { noteId: string; clientId: string }): Promise<Result> {
  const note = uuid.safeParse(raw.noteId);
  const client = uuid.safeParse(raw.clientId);
  if (!note.success || !client.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const ok = await deleteNote(userId, note.data);
  refreshClient(client.data);
  return ok ? { ok: true } : { error: 'NOT_AVAILABLE' };
}

export async function updateNextFollowUp(raw: { clientId: string; date: string | null }): Promise<Result> {
  const id = uuid.safeParse(raw.clientId);
  if (!id.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const ok = await setNextFollowUp(userId, id.data, raw.date || null);
  refreshClient(id.data);
  return ok ? { ok: true } : { error: 'NOT_AVAILABLE' };
}

/** Feedback a una revisión semanal: llega al cliente como mensaje del chat. */
export async function giveCheckinFeedback(raw: { clientId: string; checkinId: string; body: string }): Promise<Result> {
  const client = uuid.safeParse(raw.clientId);
  const checkin = uuid.safeParse(raw.checkinId);
  const body = z.string().trim().min(1).max(MAX_FEEDBACK_LEN).safeParse(raw.body);
  if (!client.success || !checkin.success || !body.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const res = await sendCheckinFeedback(userId, client.data, checkin.data, body.data);
  refreshClient(client.data);
  if ('error' in res) {
    return { error: res.error, reason: res.reason };
  }
  return { ok: true };
}

/* --- Rutina y dieta (exige el permiso de edición) --- */

export async function startClientRoutine(raw: { clientId: string; name: string }): Promise<Result<{ planId: string }>> {
  const id = uuid.safeParse(raw.clientId);
  const name = z.string().trim().min(2).max(60).safeParse(raw.name);
  if (!id.success || !name.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const planId = await createClientPlan(userId, id.data, name.data);
  if (!planId) return { error: 'NO_EDIT_PERMISSION' };
  refreshClient(id.data);
  return { ok: true, data: { planId } };
}

const dietSchema = z.object({
  clientId: uuid,
  kcal: z.number().int().min(1000).max(6000),
  proteinG: z.number().int().min(30).max(400),
  carbsG: z.number().int().min(0).max(800),
  fatG: z.number().int().min(10).max(300),
  note: z.string().trim().max(300).optional(),
});

export async function saveClientDiet(raw: z.input<typeof dietSchema>): Promise<Result> {
  const parsed = dietSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { clientId, ...target } = parsed.data;
  const { userId } = await requireUser();
  const ok = await setClientNutritionTarget(userId, clientId, target);
  if (!ok) return { error: 'NO_EDIT_PERMISSION' };
  refreshClient(clientId);
  revalidatePath('/nutrition');
  revalidatePath('/dashboard');
  return { ok: true };
}

/** Avisa al cliente, por el chat, que se actualizó su rutina o su dieta. */
export async function tellClientUpdated(raw: { clientId: string; what: 'routine' | 'diet' }): Promise<Result> {
  const id = uuid.safeParse(raw.clientId);
  if (!id.success || (raw.what !== 'routine' && raw.what !== 'diet')) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const res = await notifyClientUpdate(userId, id.data, raw.what);
  return 'error' in res ? { error: res.error } : { ok: true };
}
