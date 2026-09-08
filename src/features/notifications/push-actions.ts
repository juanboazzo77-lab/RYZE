'use server';

import { z } from 'zod';
import { requireUser } from '@/server/context';
import { prisma } from '@/server/db';
import { pushConfigured, sendPushToUser } from '@/server/push';

export interface Result {
  ok?: boolean;
  error?: string;
}

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
  userAgent: z.string().max(400).optional(),
});

export async function savePushSubscription(raw: z.infer<typeof subSchema>): Promise<Result> {
  const parsed = subSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const { endpoint, p256dh, auth, userAgent } = parsed.data;

  // El endpoint es único global: si el navegador se re-suscribe o cambia de
  // usuario, la fila pasa a este userId.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh, auth, userAgent: userAgent ?? null },
    update: { userId, p256dh, auth, userAgent: userAgent ?? null },
  });

  return { ok: true };
}

export async function removePushSubscription(raw: { endpoint: string }): Promise<Result> {
  const endpoint = z.string().url().max(1000).safeParse(raw?.endpoint);
  if (!endpoint.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  await prisma.pushSubscription.deleteMany({ where: { endpoint: endpoint.data, userId } });
  return { ok: true };
}

/** Manda un push de prueba a las suscripciones del usuario. */
export async function sendTestPush(): Promise<Result & { sent?: number }> {
  if (!pushConfigured()) return { error: 'NOT_CONFIGURED' };
  const { userId } = await requireUser();
  const { sent } = await sendPushToUser(userId, {
    title: 'FitAI',
    body: 'Las notificaciones están activadas. ¡Listo!',
    url: '/dashboard',
    tag: 'fitai-test',
  });
  return { ok: true, sent };
}
