'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireOwner } from '@/lib/owner';
import { sendMessage } from '@/server/gym-messages';

export type MessageActionResult = { ok: true; emails: number } | { error: 'INVALID' | 'NOT_OWNER' | 'TITLE' | 'BODY' };

const schema = z.object({ title: z.string().max(300), body: z.string().max(5000), email: z.boolean() });

/** El dueño le manda un mensaje a los clientes de su gimnasio. */
export async function sendClientMessage(raw: z.input<typeof schema>): Promise<MessageActionResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, gym } = await requireOwner();
  const res = await sendMessage(userId, gym.id, parsed.data);
  revalidatePath('/gym/mensajes');
  return res;
}
