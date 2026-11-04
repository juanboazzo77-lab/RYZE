'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { addMemorySchema, isDuplicateMemory, MAX_MEMORIES, type AddMemoryInput } from './schema';

interface Result {
  ok?: boolean;
  error?: string;
}

/** La persona agrega algo a mano para que el coach lo recuerde. */
export async function addCoachMemory(raw: AddMemoryInput): Promise<Result> {
  const parsed = addMemorySchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const db = forUser(userId);

  const existing = await db.coachMemory.findMany({ select: { content: true } });
  if (existing.length >= MAX_MEMORIES) return { error: 'FULL' };
  if (isDuplicateMemory(parsed.data.text, existing.map((e) => e.content))) return { error: 'DUPLICATE' };

  await db.coachMemory.create({
    data: { userId, content: parsed.data.text, category: parsed.data.category, source: 'USER' },
  });
  revalidatePath('/coach/memory');
  return { ok: true };
}

export async function deleteCoachMemory(raw: { id: string }): Promise<Result> {
  const id = z.string().uuid().safeParse(raw.id);
  if (!id.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  await forUser(userId).coachMemory.deleteMany({ where: { id: id.data } });
  revalidatePath('/coach/memory');
  return { ok: true };
}

export async function clearCoachMemories(): Promise<Result> {
  const { userId } = await requireUser();
  await forUser(userId).coachMemory.deleteMany({});
  revalidatePath('/coach/memory');
  return { ok: true };
}
