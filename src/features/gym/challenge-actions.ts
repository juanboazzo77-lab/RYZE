'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { joinChallenge, leaveChallenge } from '@/server/gym-challenges';

interface Result {
  ok?: boolean;
  error?: string;
}

const id = z.string().uuid();

/** El socio se suma a un reto de su gimnasio. Sumarse es aceptar aparecer en el ranking con su nombre y la inicial del apellido. */
export async function joinMyChallenge(raw: { id: string }): Promise<Result> {
  const parsed = id.safeParse(raw.id);
  if (!parsed.success) return { error: 'INVALID' };
  const ctx = await requireUser();
  if (!ctx.gym) return { error: 'NOT_MEMBER' };
  const res = await joinChallenge(ctx.userId, ctx.gym.gymId, parsed.data);
  revalidatePath('/training/gym/retos');
  revalidatePath('/dashboard');
  return res === 'ok' ? { ok: true } : { error: res };
}

export async function leaveMyChallenge(raw: { id: string }): Promise<Result> {
  const parsed = id.safeParse(raw.id);
  if (!parsed.success) return { error: 'INVALID' };
  const ctx = await requireUser();
  if (!ctx.gym) return { error: 'NOT_MEMBER' };
  const ok = await leaveChallenge(ctx.userId, ctx.gym.gymId, parsed.data);
  revalidatePath('/training/gym/retos');
  revalidatePath('/dashboard');
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}
