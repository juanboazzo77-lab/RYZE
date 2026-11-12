import 'server-only';
import { prisma } from './db';

/** Mensajes que el gimnasio le manda a sus clientes (los carga el dueño en su panel). */

export interface MemberMessage {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

/** Los mensajes recientes del gimnasio del socio. Si falla (por ejemplo mientras se aplica una migración), ninguno. */
export async function listMemberMessages(gymId: string, days = 30, limit = 5): Promise<MemberMessage[]> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await prisma.gymMessage.findMany({ where: { gymId, createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: limit });
    return rows.map((m) => ({ id: m.id, title: m.title, body: m.body, createdAt: m.createdAt.toISOString() }));
  } catch (e) {
    console.error('[gym-messages] no se pudieron leer los mensajes:', e instanceof Error ? e.message : e);
    return [];
  }
}
