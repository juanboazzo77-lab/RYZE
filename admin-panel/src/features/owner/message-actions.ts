'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireOwner } from '@/lib/owner';
import { endMessage, sendMessage } from '@/server/gym-messages';

export type MessageActionResult = { ok: true; notified: number } | { error: 'INVALID' | 'NOT_OWNER' | 'TITLE' | 'BODY' };

const schema = z.object({ title: z.string().max(300), body: z.string().max(5000), days: z.number().int().min(1).max(60) });

/** El dueño le manda un mensaje a todos los clientes conectados a su gimnasio. */
export async function sendClientMessage(raw: z.input<typeof schema>): Promise<MessageActionResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, gym } = await requireOwner();
  const res = await sendMessage(userId, gym.id, parsed.data);
  revalidatePath('/gym/mensajes');
  return res;
}

/** Saca un mensaje de la pantalla de los clientes antes de que venza. */
export async function endClientMessage(raw: { id: string }): Promise<{ ok?: boolean }> {
  const id = z.string().uuid().safeParse(raw.id);
  if (!id.success) return {};
  const { userId, gym } = await requireOwner();
  const ok = await endMessage(userId, gym.id, id.data);
  revalidatePath('/gym/mensajes');
  return ok ? { ok: true } : {};
}
