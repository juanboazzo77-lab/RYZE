'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/server/context';
import { z } from 'zod';
import { leaveGym, redeemGymCode, setShareActivity } from '@/server/gyms';
import type { JoinError } from './logic';

interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

const joinSchema = z.object({ code: z.string().max(30), share: z.boolean().optional() });

/** La persona entra a su gimnasio con el código: prueba gratis de 3 días y después tiene que pagar su plan. */
export async function joinGym(raw: { code: string; share?: boolean }): Promise<Result<{ gymName: string; trialEndsAt: string }> & { reason?: JoinError }> {
  const parsed = joinSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID', reason: 'INVALID_CODE' };
  const { userId } = await requireUser();
  const res = await redeemGymCode(userId, parsed.data.code, parsed.data.share === true);
  if ('error' in res) return { error: res.error, reason: res.error };
  for (const p of ['/settings', '/settings/gym', '/dashboard', '/training', '/training/gym']) revalidatePath(p);
  return { ok: true, data: { gymName: res.gymName, trialEndsAt: res.trialEndsAt.toISOString() } };
}

export async function leaveMyGym(): Promise<Result> {
  const { userId } = await requireUser();
  await leaveGym(userId);
  revalidatePath('/settings');
  revalidatePath('/settings/gym');
  revalidatePath('/dashboard');
  return { ok: true };
}

/* --- Permiso del socio --- */

/** El socio decide si su gimnasio ve su nombre y su actividad. */
export async function setMyShareActivity(raw: { share: boolean }): Promise<Result> {
  const { userId } = await requireUser();
  const ok = await setShareActivity(userId, raw.share === true);
  revalidatePath('/settings/gym');
  return ok ? { ok: true } : { error: 'NOT_MEMBER' };
}
