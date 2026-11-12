import 'server-only';
import { prisma } from './db';
import { codeStats } from '@/features/gym/code-share';

/** Cuántas personas entraron al gimnasio con su código (prueba de 3 días): para su dueño. Solo de su gimnasio. */
export async function getCodeStats(ownerUserId: string, gymId: string): Promise<{ total: number; inTrial: number; ended: number } | null> {
  const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerUserId }, select: { id: true } });
  if (!gym) return null;
  try {
    const members = await prisma.gymMember.findMany({ where: { gymId, status: 'ACTIVE', source: 'CODE' }, select: { trialEndsAt: true } });
    return codeStats(members);
  } catch (e) {
    // Si falla (por ejemplo mientras se aplica una migración), no se muestran números en vez de romper la página.
    console.error('[codigo] no se pudieron leer los ingresos con el código:', e instanceof Error ? e.message : e);
    return null;
  }
}
