import 'server-only';
import { after } from 'next/server';
import { prisma } from './db';
import { cleanMessage } from '@/features/gym/messages';

/**
 * Mensajes del dueño del gimnasio a sus clientes conectados: aparecen como una ventana en la pantalla principal de la
 * app durante unos días y después desaparecen, y les llega una notificación. Para hablar con una sola persona, el dueño
 * usa el botón de WhatsApp de su ficha (uno a uno). Se comprueba que la cuenta sea la dueña.
 */

export interface MessageRow {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  expiresAt: string;
  active: boolean;
}

async function ownedGym(ownerUserId: string, gymId: string) {
  return prisma.gym.findFirst({ where: { id: gymId, ownerUserId, status: 'ACTIVE' }, select: { id: true, name: true } });
}

export async function listMessages(ownerUserId: string, gymId: string, limit = 30): Promise<MessageRow[] | null> {
  if (!(await ownedGym(ownerUserId, gymId))) return null;
  const now = Date.now();
  const rows = await prisma.gymMessage.findMany({ where: { gymId }, orderBy: { createdAt: 'desc' }, take: limit });
  return rows.map((m) => ({ id: m.id, title: m.title, body: m.body, createdAt: m.createdAt.toISOString(), expiresAt: m.expiresAt.toISOString(), active: m.expiresAt.getTime() > now }));
}

export type SendMessageResult = { ok: true; notified: number } | { error: 'NOT_OWNER' | 'TITLE' | 'BODY' };

/**
 * Publica el mensaje y les crea una notificación a los clientes conectados al gimnasio. Después le pide a la app que las
 * entregue enseguida (si no se puede, el cron diario las entrega).
 */
export async function sendMessage(ownerUserId: string, gymId: string, raw: Parameters<typeof cleanMessage>[0]): Promise<SendMessageResult> {
  const gym = await ownedGym(ownerUserId, gymId);
  if (!gym) return { error: 'NOT_OWNER' };
  const input = cleanMessage(raw);
  if ('error' in input) return input;
  const now = new Date();
  await prisma.gymMessage.create({
    data: { gymId, title: input.title, body: input.body, expiresAt: new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000) },
  });

  const members = await prisma.gymMember.findMany({ where: { gymId, status: 'ACTIVE' }, select: { userId: true } });
  if (members.length > 0) {
    await prisma.notification.createMany({
      data: members.map((m) => ({
        userId: m.userId,
        kind: 'GYM_MESSAGE' as const,
        title: gym.name,
        body: `${input.title}: ${input.body}`.slice(0, 140),
        url: '/dashboard',
        scheduledFor: now,
      })),
    });
    // Que lleguen enseguida: se le avisa a la app (necesita NOTIFY_SECRET en el panel y en la app; sin eso, llegan con el cron diario).
    const base = process.env.MAIN_APP_URL?.trim().replace(/\/+$/, '') || 'https://www.forzaai.app';
    const secret = process.env.NOTIFY_SECRET;
    if (secret) {
      after(async () => {
        await fetch(`${base}/api/internal/notify-flush`, { method: 'POST', headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(30_000) }).catch((e) => console.error('[mensajes] no se pudo avisar a la app:', e instanceof Error ? e.message : e));
      });
    }
  }
  return { ok: true, notified: members.length };
}

/** Saca un mensaje de la pantalla principal de los clientes ahora mismo. */
export async function endMessage(ownerUserId: string, gymId: string, id: string): Promise<boolean> {
  if (!(await ownedGym(ownerUserId, gymId))) return false;
  const res = await prisma.gymMessage.updateMany({ where: { id, gymId, expiresAt: { gt: new Date() } }, data: { expiresAt: new Date() } });
  return res.count > 0;
}
