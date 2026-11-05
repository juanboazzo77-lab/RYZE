'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { leaveGym, redeemGymCode } from '@/server/gyms';
import type { JoinError } from './logic';

interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

const codeSchema = z.string().trim().min(4).max(30);

/** El socio entra a su gimnasio con el código. */
export async function joinGym(raw: { code: string }): Promise<Result<{ gymName: string }> & { reason?: JoinError }> {
  const code = codeSchema.safeParse(raw.code);
  if (!code.success) return { error: 'INVALID', reason: 'INVALID_CODE' };
  const { userId } = await requireUser();
  const res = await redeemGymCode(userId, code.data);
  revalidatePath('/settings');
  revalidatePath('/settings/gym');
  revalidatePath('/dashboard');
  return 'ok' in res ? { ok: true, data: { gymName: res.gymName } } : { error: res.error, reason: res.error };
}

export async function leaveMyGym(): Promise<Result> {
  const { userId } = await requireUser();
  await leaveGym(userId);
  revalidatePath('/settings');
  revalidatePath('/settings/gym');
  revalidatePath('/dashboard');
  return { ok: true };
}
