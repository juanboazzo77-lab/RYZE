'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireOwner } from '@/lib/owner';
import { createChallenge, deleteChallenge } from '@/server/gym-challenges';

interface Result {
  ok?: boolean;
  error?: 'INVALID' | 'NOT_OWNER' | 'TITLE' | 'DATES' | 'TOO_LONG' | 'TOO_MANY' | 'PAST' | 'NOT_FOUND';
}

const schema = z.object({
  title: z.string().max(200),
  description: z.string().max(1000).optional(),
  metric: z.string().max(20),
  startsOn: z.string().max(10),
  endsOn: z.string().max(10),
  prize: z.string().max(400).optional(),
});

export async function createChallengeAction(raw: z.input<typeof schema>): Promise<Result> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, gym } = await requireOwner();
  const res = await createChallenge(userId, gym.id, parsed.data);
  revalidatePath('/gym/retos');
  return 'ok' in res ? { ok: true } : { error: res.error };
}

export async function deleteChallengeAction(raw: { id: string }): Promise<Result> {
  const id = z.string().uuid().safeParse(raw.id);
  if (!id.success) return { error: 'INVALID' };
  const { userId } = await requireOwner();
  const ok = await deleteChallenge(userId, id.data);
  revalidatePath('/gym/retos');
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}
