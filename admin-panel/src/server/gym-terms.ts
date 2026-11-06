import 'server-only';
import { prisma } from './db';
import { TERMS_VERSION } from '@/features/legal/gym-terms';

/** ¿Este gimnasio ya aceptó la versión vigente de los términos? */
export async function hasAcceptedTerms(gymId: string): Promise<boolean> {
  const g = await prisma.gym.findUnique({ where: { id: gymId }, select: { termsVersion: true } });
  return g?.termsVersion === TERMS_VERSION;
}

/** El dueño acepta los términos en nombre de SU gimnasio. */
export async function acceptTerms(ownerUserId: string, gymId: string): Promise<boolean> {
  const res = await prisma.gym.updateMany({ where: { id: gymId, ownerUserId }, data: { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION } });
  return res.count > 0;
}
