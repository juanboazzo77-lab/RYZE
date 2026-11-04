'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { isAdmin } from '@/server/admin';
import {
  becomeTrainerAccount,
  cancelTrainerAccount,
  endClientLink,
  getActiveTrainer,
  previewInviteCode,
  redeemInviteCode,
  regenerateInviteCode,
  setTrainerStatus,
} from '@/server/trainers';
import { TRAINER_STATUSES } from './logic';

interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

const applySchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  bio: z.string().trim().max(300).optional(),
  credential: z.string().trim().min(3).max(200),
});

/**
 * Elige "soy entrenador" al crear la cuenta: pasa a ser una cuenta de entrenador (sin el cuestionario
 * de cliente) y queda pendiente hasta que se apruebe a mano.
 */
export async function chooseTrainerAccount(raw: z.input<typeof applySchema>): Promise<Result> {
  const parsed = applySchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const res = await becomeTrainerAccount(userId, {
    displayName: parsed.data.displayName,
    bio: parsed.data.bio || null,
    credential: parsed.data.credential,
  });
  if ('error' in res) return { error: res.error };
  revalidatePath('/trainer');
  revalidatePath('/settings/trainer');
  return { ok: true };
}

/** Antes de aceptar, el cliente ve de quién es el código. */
export async function previewTrainerCode(raw: { code: string }): Promise<Result<{ displayName: string; credential: string | null }>> {
  await requireUser();
  const found = await previewInviteCode(String(raw.code ?? ''));
  return found ? { ok: true, data: found } : { error: 'INVALID_CODE' };
}

/** El cliente acepta compartir sus datos con el entrenador. Sin `consent: true` no se hace nada. */
export async function acceptTrainerCode(raw: { code: string; consent: boolean }): Promise<Result> {
  if (raw.consent !== true) return { error: 'CONSENT_REQUIRED' };
  const { userId } = await requireUser();
  const res = await redeemInviteCode(userId, String(raw.code ?? ''));
  if ('error' in res) return { error: res.error };
  revalidatePath('/settings/trainer');
  return { ok: true };
}

/** El cliente deja de compartir: el entrenador deja de ver sus datos en el mismo momento. */
export async function stopSharingWithTrainer(): Promise<Result> {
  const { userId } = await requireUser();
  await endClientLink({ clientId: userId, by: 'CLIENT' });
  revalidatePath('/settings/trainer');
  revalidatePath('/trainer');
  return { ok: true };
}

/** El entrenador da de baja a un cliente. */
export async function removeTrainerClient(raw: { clientId: string }): Promise<Result> {
  const id = z.string().uuid().safeParse(raw.clientId);
  if (!id.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const trainer = await getActiveTrainer(userId);
  if (!trainer) return { error: 'FORBIDDEN' };
  await endClientLink({ clientId: id.data, trainerId: userId, by: 'TRAINER' });
  revalidatePath('/trainer');
  return { ok: true };
}

export async function renewInviteCode(): Promise<Result<{ code: string }>> {
  const { userId } = await requireUser();
  const trainer = await getActiveTrainer(userId);
  if (!trainer) return { error: 'FORBIDDEN' };
  const code = await regenerateInviteCode(userId);
  if (!code) return { error: 'ERROR' };
  revalidatePath('/settings/trainer');
  return { ok: true, data: { code } };
}

/** Aprobar, suspender o volver a poner pendiente a un entrenador. Sólo ADMIN_EMAILS. */
export async function adminSetTrainerStatus(raw: { userId: string; status: string }): Promise<Result> {
  const input = z.object({ userId: z.string().uuid(), status: z.enum(TRAINER_STATUSES) }).safeParse(raw);
  if (!input.success) return { error: 'INVALID' };
  const { email } = await requireUser();
  if (!isAdmin(email)) return { error: 'FORBIDDEN' };
  const ok = await setTrainerStatus(input.data.userId, input.data.status);
  revalidatePath('/admin/trainers');
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}

/** El entrenador deja de serlo: su cuenta vuelve a ser de cliente (y hace el cuestionario de cliente). */
export async function cancelTrainerRole(): Promise<Result> {
  const { userId } = await requireUser();
  const res = await cancelTrainerAccount(userId);
  if ('error' in res) return { error: res.error };
  revalidatePath('/', 'layout');
  return { ok: true };
}
