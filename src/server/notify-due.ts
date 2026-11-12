import 'server-only';
import type { NotificationKind } from '@prisma/client';
import { prisma } from './db';
import { sendPushToUser } from './push';
import { sendApnsToUser } from './apns';

/**
 * Entrega las notificaciones pendientes (`sent_at` vacío y ya vencidas): Web Push y, si hay iPhone registrado y la clave
 * de Apple cargada, también al celular. Las marca como enviadas. La usan el cron diario y el aviso inmediato de un
 * mensaje del gimnasio (el panel crea las notificaciones y llama a /api/internal/notify-flush).
 */
export async function deliverDueNotifications(opts: { kinds?: NotificationKind[]; take?: number } = {}): Promise<{ delivered: number; pushed: number }> {
  const pending = await prisma.notification.findMany({
    where: { sentAt: null, scheduledFor: { lte: new Date() }, ...(opts.kinds ? { kind: { in: opts.kinds } } : {}) },
    orderBy: { scheduledFor: 'asc' },
    take: opts.take ?? 500,
  });

  let pushed = 0;
  for (const n of pending) {
    const payload = { title: n.title, body: n.body ?? undefined, url: n.url ?? '/dashboard', tag: n.kind.toLowerCase() };
    try {
      const { sent } = await sendPushToUser(n.userId, payload);
      pushed += sent;
    } catch (e) {
      console.error('[notificaciones] push falló', n.id, (e as Error).message);
    }
    try {
      const { sent } = await sendApnsToUser(n.userId, payload);
      pushed += sent;
    } catch (e) {
      console.error('[notificaciones] apns falló', n.id, (e as Error).message);
    }
    await prisma.notification.update({ where: { id: n.id }, data: { sentAt: new Date() } });
  }
  return { delivered: pending.length, pushed };
}
