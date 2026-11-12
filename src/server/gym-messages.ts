import 'server-only';
import { prisma } from './db';

/** Mensajes que el gimnasio le manda a sus clientes conectados (los carga el dueño en su panel). */

export interface MemberMessage {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Los mensajes vigentes del gimnasio del socio: los que todavía no vencieron. Cuando vencen (o el dueño los saca)
 * dejan de aparecer. Si falla (por ejemplo mientras se aplica una migración), ninguno.
 */
export async function listActiveMessages(gymId: string, limit = 3): Promise<MemberMessage[]> {
  try {
    const rows = await prisma.gymMessage.findMany({ where: { gymId, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' }, take: limit });
    return rows.map((m) => ({ id: m.id, title: m.title, body: m.body, createdAt: m.createdAt.toISOString(), expiresAt: m.expiresAt.toISOString() }));
  } catch (e) {
    console.error('[gym-messages] no se pudieron leer los mensajes:', e instanceof Error ? e.message : e);
    return [];
  }
}
