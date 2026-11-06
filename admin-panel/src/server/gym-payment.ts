import 'server-only';
import { prisma } from './db';
import { normalizePaymentAlias, normalizePaymentLink } from '@/features/owner/payment';
import { normalizeHexColor, safeLogoUrl } from '@/features/gym/brand';

/** Datos de cobro del gimnasio (link de pago y alias) para su QR. Cada función comprueba que la cuenta sea la dueña. */

export interface PaymentInfo {
  gymName: string;
  link: string | null;
  alias: string | null;
  logoUrl: string | null;
  color: string | null;
}

export async function getPaymentInfo(ownerUserId: string, gymId: string): Promise<PaymentInfo | null> {
  const g = await prisma.gym.findFirst({
    where: { id: gymId, ownerUserId },
    select: { name: true, paymentLink: true, paymentAlias: true, logoUrl: true, brandColor: true },
  });
  if (!g) return null;
  return {
    gymName: g.name,
    link: normalizePaymentLink(g.paymentLink),
    alias: normalizePaymentAlias(g.paymentAlias),
    logoUrl: safeLogoUrl(g.logoUrl),
    color: normalizeHexColor(g.brandColor),
  };
}

/** Guarda el link y el alias. Vacío = sacarlo. Si algo escrito no sirve, no se guarda nada. */
export async function savePaymentInfo(
  ownerUserId: string,
  gymId: string,
  raw: { link: string; alias: string },
): Promise<'ok' | 'INVALID_LINK' | 'INVALID_ALIAS' | 'NOT_OWNER'> {
  const linkTxt = raw.link.trim();
  const aliasTxt = raw.alias.trim();
  const link = linkTxt === '' ? null : normalizePaymentLink(linkTxt);
  const alias = aliasTxt === '' ? null : normalizePaymentAlias(aliasTxt);
  if (linkTxt !== '' && !link) return 'INVALID_LINK';
  if (aliasTxt !== '' && !alias) return 'INVALID_ALIAS';
  const res = await prisma.gym.updateMany({ where: { id: gymId, ownerUserId }, data: { paymentLink: link, paymentAlias: alias } });
  return res.count > 0 ? 'ok' : 'NOT_OWNER';
}
