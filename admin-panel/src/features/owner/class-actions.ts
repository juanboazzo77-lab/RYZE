'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireOwner } from '@/lib/owner';
import { createClasses, deleteClass, setClassActive } from '@/server/gym-classes';

interface Result {
  ok?: boolean;
  error?: 'INVALID' | 'NOT_OWNER' | 'NAME' | 'WEEKDAYS' | 'TIME' | 'DURATION' | 'CAPACITY' | 'TOO_MANY' | 'NOT_FOUND';
}

const schema = z.object({
  name: z.string().max(200),
  description: z.string().max(400).optional(),
  instructor: z.string().max(200).optional(),
  weekdays: z.array(z.number().int().min(1).max(7)).max(7),
  startTime: z.string().max(5),
  durationMin: z.number().min(1).max(600),
  capacity: z.number().min(1).max(1000),
});

export async function createClassAction(raw: z.input<typeof schema>): Promise<Result> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, gym } = await requireOwner();
  const res = await createClasses(userId, gym.id, parsed.data);
  revalidatePath('/gym/clases');
  return 'ok' in res ? { ok: true } : { error: res.error };
}

export async function setClassActiveAction(raw: { id: string; active: boolean }): Promise<Result> {
  const id = z.string().uuid().safeParse(raw.id);
  if (!id.success) return { error: 'INVALID' };
  const { userId } = await requireOwner();
  const ok = await setClassActive(userId, id.data, raw.active === true);
  revalidatePath('/gym/clases');
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}

export async function deleteClassAction(raw: { id: string }): Promise<Result> {
  const id = z.string().uuid().safeParse(raw.id);
  if (!id.success) return { error: 'INVALID' };
  const { userId } = await requireOwner();
  const ok = await deleteClass(userId, id.data);
  revalidatePath('/gym/clases');
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}
