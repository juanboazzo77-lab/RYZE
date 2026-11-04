import 'server-only';
import { after } from 'next/server';
import { prisma } from './db';
import { sendPushToUser } from './push';
import { sendApnsToUser } from './apns';
import { checkContactInfo, type ContactReason } from '@/features/trainer/contact-filter';

/**
 * Chat entre un entrenador y su cliente. Los mensajes cuelgan del vínculo (trainer_client): sólo
 * los ven las dos personas y sólo mientras el vínculo está activo y el entrenador sigue aprobado.
 * Cada lectura y cada envío vuelven a comprobarlo acá; el navegador sólo manda el id del vínculo.
 * Los mensajes pasan por un filtro que frena teléfonos, correos, enlaces y redes (ver contact-filter).
 */

export const MAX_MESSAGE_LEN = 1000;
/** Tope de mensajes por minuto de una persona en un vínculo (evita saturar el chat). */
const MAX_PER_MINUTE = 15;
const THREAD_LIMIT = 150;

export interface ChatLink {
  id: string;
  trainerId: string;
  clientId: string;
}

const ACTIVE_LINK = { status: 'ACTIVE', trainer: { status: 'ACTIVE' } } as const;

/** El vínculo activo de esa persona (como entrenador o como cliente), o null si no es suyo. */
async function participantLink(userId: string, linkId: string): Promise<ChatLink | null> {
  return prisma.trainerClient.findFirst({
    where: { id: linkId, ...ACTIVE_LINK, OR: [{ trainerId: userId }, { clientId: userId }] },
    select: { id: true, trainerId: true, clientId: true },
  });
}

export interface ChatTarget {
  linkId: string;
  otherName: string;
}

/** Desde el lado del entrenador: el chat con uno de sus clientes. */
export async function getTrainerSideChat(trainerId: string, clientId: string): Promise<ChatTarget | null> {
  const link = await prisma.trainerClient.findFirst({
    where: { trainerId, clientId, ...ACTIVE_LINK },
    select: { id: true, client: { select: { name: true } } },
  });
  return link ? { linkId: link.id, otherName: link.client.name?.trim() || 'Cliente' } : null;
}

/** Desde el lado del cliente: el chat con su entrenador. */
export async function getClientSideChat(clientId: string): Promise<ChatTarget | null> {
  const link = await prisma.trainerClient.findFirst({
    where: { clientId, ...ACTIVE_LINK },
    select: { id: true, trainer: { select: { displayName: true } } },
  });
  return link ? { linkId: link.id, otherName: link.trainer.displayName } : null;
}

export interface ThreadMessage {
  id: string;
  mine: boolean;
  body: string;
  createdAt: string;
  /** Sólo importa en los míos: la otra persona ya lo vio. */
  seen: boolean;
}

/** Los últimos mensajes. Al abrirlos, los de la otra persona quedan como vistos. */
export async function fetchThread(userId: string, linkId: string): Promise<ThreadMessage[] | null> {
  const link = await participantLink(userId, linkId);
  if (!link) return null;
  await prisma.trainerMessage.updateMany({
    where: { linkId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
  const rows = await prisma.trainerMessage.findMany({
    where: { linkId },
    orderBy: { createdAt: 'desc' },
    take: THREAD_LIMIT,
    select: { id: true, senderId: true, body: true, createdAt: true, readAt: true },
  });
  return rows.reverse().map((m) => ({
    id: m.id,
    mine: m.senderId === userId,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    seen: !!m.readAt,
  }));
}

export type SendError = 'INVALID' | 'NOT_LINKED' | 'RATE' | 'BLOCKED';

export async function sendMessage(
  userId: string,
  linkId: string,
  rawBody: string,
): Promise<{ ok: true } | { error: SendError; reason?: ContactReason }> {
  const body = rawBody.replace(/\r\n/g, '\n').trim();
  if (body.length === 0 || body.length > MAX_MESSAGE_LEN) return { error: 'INVALID' };

  const link = await participantLink(userId, linkId);
  if (!link) return { error: 'NOT_LINKED' };

  const recent = await prisma.trainerMessage.count({
    where: { linkId, senderId: userId, createdAt: { gte: new Date(Date.now() - 60_000) } },
  });
  if (recent >= MAX_PER_MINUTE) return { error: 'RATE' };

  const check = checkContactInfo(body);
  if (check.blocked) {
    // Se anota el intento (sin el texto) para ver si alguien insiste.
    await prisma.trainerMessageBlock.create({
      data: { linkId, senderId: userId, reason: check.reason ?? 'OFF_PLATFORM' },
    });
    return { error: 'BLOCKED', reason: check.reason };
  }

  const created = await prisma.trainerMessage.create({ data: { linkId, senderId: userId, body } });
  // Aviso fuera de la app a la otra persona (sin el texto del mensaje). No frena ni rompe el envío.
  try {
    after(() => notifyNewMessage(link, userId, created.id));
  } catch {
    void notifyNewMessage(link, userId, created.id);
  }
  return { ok: true };
}

/**
 * Push a la otra persona del chat. Si ya tiene mensajes sin leer de esta misma persona de los últimos
 * minutos no se vuelve a avisar (así una ráfaga de mensajes no la llena de avisos). El texto no viaja
 * en el aviso: sólo quién escribió.
 */
async function notifyNewMessage(link: ChatLink, senderId: string, messageId: string): Promise<void> {
  try {
    const fromTrainer = link.trainerId === senderId;
    const recipientId = fromTrainer ? link.clientId : link.trainerId;
    const recentUnread = await prisma.trainerMessage.count({
      where: {
        linkId: link.id,
        senderId,
        readAt: null,
        id: { not: messageId },
        createdAt: { gte: new Date(Date.now() - 3 * 60_000) },
      },
    });
    if (recentUnread > 0) return;

    let name = 'Tu entrenador';
    let url = '/settings/trainer/chat';
    if (fromTrainer) {
      const t = await prisma.trainerProfile.findUnique({ where: { userId: senderId }, select: { displayName: true } });
      if (t?.displayName) name = t.displayName;
    } else {
      const c = await prisma.profile.findUnique({ where: { id: senderId }, select: { name: true } });
      name = c?.name?.trim() || 'Tu cliente';
      url = `/trainer/clients/${senderId}/chat`;
    }
    const push = { title: name, body: 'Te escribió un mensaje', url, tag: `trainer-chat-${link.id}` };
    // Navegador/PWA (Web Push) y app de iPhone (APNs): cada uno llega sólo si esa persona lo tiene.
    await Promise.allSettled([sendPushToUser(recipientId, push), sendApnsToUser(recipientId, push)]);
  } catch (e) {
    console.error('[trainer-chat] no se pudo enviar el aviso', e instanceof Error ? e.message : e);
  }
}

/** Mensajes sin leer del entrenador, por cliente. */
export async function trainerUnreadByClient(trainerId: string): Promise<Map<string, number>> {
  const rows = await prisma.trainerMessage.groupBy({
    by: ['linkId'],
    where: { readAt: null, senderId: { not: trainerId }, link: { trainerId, ...ACTIVE_LINK } },
    _count: { _all: true },
  });
  if (rows.length === 0) return new Map();
  const links = await prisma.trainerClient.findMany({
    where: { id: { in: rows.map((r) => r.linkId) } },
    select: { id: true, clientId: true },
  });
  const out = new Map<string, number>();
  for (const r of rows) {
    const clientId = links.find((l) => l.id === r.linkId)?.clientId;
    if (clientId) out.set(clientId, r._count._all);
  }
  return out;
}

/** Mensajes sin leer del cliente (de su entrenador). */
export async function clientUnreadCount(clientId: string): Promise<number> {
  return prisma.trainerMessage.count({
    where: { readAt: null, senderId: { not: clientId }, link: { clientId, ...ACTIVE_LINK } },
  });
}

/** Intentos de pasar contactos que el filtro frenó en los últimos 30 días, por persona. */
export async function blockedAttemptsBySender(senderIds: string[]): Promise<Map<string, number>> {
  if (senderIds.length === 0) return new Map();
  const rows = await prisma.trainerMessageBlock.groupBy({
    by: ['senderId'],
    where: { senderId: { in: senderIds }, createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.senderId, r._count._all]));
}
