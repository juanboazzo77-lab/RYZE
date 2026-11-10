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

/**
 * Dirección base del enlace de compra de la web (REVENUECAT_WEB_PURCHASE_URL), ya limpia. Tolera lo que pasa al
 * pegarla: espacios, comillas de más, que falte el "https://" delante de pay.rev.cat, o el marcador del usuario al
 * final, o un identificador de más después del token (en pay.rev.cat solo se conserva el token). Null si está vacía o no es una
 * dirección https.
 */
export function normalizePurchaseBase(raw: string | null | undefined): string | null {
  let v = (raw ?? '').trim().replace(/^["']+|["']+$/g, '').trim();
  if (!v) return null;
  if (/^pay\.rev\.cat\//i.test(v)) v = `https://${v}`;
  // La documentación muestra el enlace con un marcador al final ("/<app_user_id>"): se saca, el identificador lo suma la app.
  v = v.replace(/\/(?:<[^/]*>|\{[^/]*\}|\[[^/]*\]|[^/]*app_?user_?id[^/]*)\/?$/i, '');
  if (!/^https:\/\/[^\s"'<>]+$/i.test(v)) return null;
  // Un enlace de pay.rev.cat es https://pay.rev.cat/<token> (o .../sandbox/<token>); lo que venga después (un
  // identificador de usuario de más, parámetros) se descarta: el identificador de cada persona lo suma la app.
  try {
    const u = new URL(v);
    if (u.hostname.toLowerCase() === 'pay.rev.cat') {
      const seg = u.pathname.split('/').filter(Boolean);
      const keep = seg[0]?.toLowerCase() === 'sandbox' ? seg.slice(0, 2) : seg.slice(0, 1);
      if (keep.length === 0 || (seg[0]?.toLowerCase() === 'sandbox' && keep.length < 2)) return null;
      return `https://pay.rev.cat/${keep.join('/')}`;
    }
  } catch {
    return null;
  }
  return v;
}

/**
 * Enlace de compra de la web (RevenueCat) para esta persona: la dirección base lleva el identificador del usuario al
 * final, para que lo comprado se active en su cuenta. Null si todavía no está configurado o no sirve.
 */
export function webPurchaseUrlFor(userId: string, base = process.env.REVENUECAT_WEB_PURCHASE_URL): string | null {
  const b = normalizePurchaseBase(base);
  return b ? `${b.replace(/\/+$/, '')}/${encodeURIComponent(userId)}` : null;
}

/** Por qué no hay enlace (para el registro del servidor; nunca se imprime el valor, tiene el token). */
export function webPurchaseProblem(base = process.env.REVENUECAT_WEB_PURCHASE_URL): 'MISSING' | 'INVALID' | null {
  if (!(base ?? '').trim()) return 'MISSING';
  return normalizePurchaseBase(base) ? null : 'INVALID';
}
