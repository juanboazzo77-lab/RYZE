import 'server-only';
import { prisma } from './db';
import { normalizeGymCode } from '@/features/gym/logic';
import { normalizeHexColor, safeLogoUrl } from '@/features/gym/brand';

/**
 * Página pública de cada gimnasio (la abre el QR del panel) y de qué gimnasio viene cada persona. Todo se identifica
 * por el código público del gimnasio; solo los gimnasios ACTIVOS tienen página.
 */

export interface GymLanding {
  id: string;
  name: string;
  city: string | null;
  logoUrl: string | null;
  brandColor: string | null;
}

export async function getGymLanding(rawCode: string): Promise<GymLanding | null> {
  const code = normalizeGymCode(rawCode);
  if (!code) return null;
  const g = await prisma.gym.findFirst({
    where: { inviteCode: code, status: 'ACTIVE' },
    select: { id: true, name: true, city: true, logoUrl: true, brandColor: true },
  });
  return g ? { id: g.id, name: g.name, city: g.city, logoUrl: safeLogoUrl(g.logoUrl), brandColor: normalizeHexColor(g.brandColor) } : null;
}

/** Anota que esta persona vino de este gimnasio (la primera vez; si ya tenía uno, no lo cambia). */
export async function recordGymReferral(userId: string, gymId: string): Promise<void> {
  await prisma.gymReferral.upsert({ where: { userId }, update: {}, create: { userId, gymId } });
}
