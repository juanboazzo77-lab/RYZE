'use server';

import { z } from 'zod';
import { requireUser } from '@/server/context';
import { fetchThread, sendMessage, type SendError, type ThreadMessage } from '@/server/trainer-chat';
import type { ContactReason } from './contact-filter';

const idSchema = z.string().uuid();

/** Los mensajes del chat (los de la otra persona quedan como vistos). */
export async function loadChatThread(raw: { linkId: string }): Promise<{ ok?: boolean; error?: string; messages?: ThreadMessage[] }> {
  const linkId = idSchema.safeParse(raw.linkId);
  if (!linkId.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const messages = await fetchThread(userId, linkId.data);
  return messages ? { ok: true, messages } : { error: 'NOT_LINKED' };
}

export async function sendChatMessage(raw: {
  linkId: string;
  body: string;
}): Promise<{ ok?: boolean; error?: SendError; reason?: ContactReason }> {
  const linkId = idSchema.safeParse(raw.linkId);
  if (!linkId.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const res = await sendMessage(userId, linkId.data, String(raw.body ?? ''));
  return 'ok' in res ? { ok: true } : { error: res.error, reason: res.reason };
}
