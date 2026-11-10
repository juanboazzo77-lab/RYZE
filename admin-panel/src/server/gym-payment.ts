import 'server-only';
import { prisma } from './db';
import { normalizeAmount, normalizePaymentAlias, normalizePaymentLink } from '@/features/owner/payment';
import { normalizeHexColor, safeLogoUrl } from '@/features/gym/brand';
import { asCurrency, type Currency } from '@/features/gym/money';

/**
 * Datos de cobro del gimnasio para sus dos QR: la cuota de siempre y el plan de rutina con IA que sus clientes
 * pueden pagar aparte. Cada función comprueba que la cuenta sea la dueña.
 */

export interface PaymentInfo {
  gymName: string;
  /** Cuota del gimnasio. */
  link: string | null;
  alias: string | null;
  /** Plan de rutina con IA (cobro aparte). */
  planLink: string | null;
  planAmount: number | null;
  currency: Currency;
  /** Código público del gimnasio (arma la dirección de su página web). Null hasta que lo aprueban. */
  inviteCode: string | null;
  logoUrl: string | null;
  color: string | null;
}

export async function getPaymentInfo(ownerUserId: string, gymId: string): Promise<PaymentInfo | null> {
  const g = await prisma.gym.findFirst({
    where: { id: gymId, ownerUserId },
    select: { name: true, paymentLink: true, paymentAlias: true, paymentPlanLink: true, paymentPlanAmount: true, currency: true, inviteCode: true, logoUrl: true, brandColor: true },
  });
  if (!g) return null;
  return {
    gymName: g.name,
    link: normalizePaymentLink(g.paymentLink),
    alias: normalizePaymentAlias(g.paymentAlias),
    planLink: normalizePaymentLink(g.paymentPlanLink),
    planAmount: g.paymentPlanAmount === null ? null : Number(g.paymentPlanAmount),
    currency: asCurrency(g.currency),
    inviteCode: g.inviteCode,
    logoUrl: safeLogoUrl(g.logoUrl),
    color: normalizeHexColor(g.brandColor),
  };
}

export type SavePaymentResult = 'ok' | 'INVALID_LINK' | 'INVALID_ALIAS' | 'INVALID_PLAN_LINK' | 'INVALID_AMOUNT' | 'NOT_OWNER';

/** Guarda los datos de cobro. Vacío = sacarlo. Si algo escrito no sirve, no se guarda nada. */
export async function savePaymentInfo(
  ownerUserId: string,
  gymId: string,
  raw: { link: string; alias: string; planLink: string; planAmount: string },
): Promise<SavePaymentResult> {
  const linkTxt = raw.link.trim();
  const aliasTxt = raw.alias.trim();
  const planLinkTxt = raw.planLink.trim();
  const amountTxt = raw.planAmount.trim();
  const link = linkTxt === '' ? null : normalizePaymentLink(linkTxt);
  const alias = aliasTxt === '' ? null : normalizePaymentAlias(aliasTxt);
  const planLink = planLinkTxt === '' ? null : normalizePaymentLink(planLinkTxt);
  const planAmount = amountTxt === '' ? null : normalizeAmount(amountTxt);
  if (linkTxt !== '' && !link) return 'INVALID_LINK';
  if (aliasTxt !== '' && !alias) return 'INVALID_ALIAS';
  if (planLinkTxt !== '' && !planLink) return 'INVALID_PLAN_LINK';
  if (amountTxt !== '' && planAmount === null) return 'INVALID_AMOUNT';
  const res = await prisma.gym.updateMany({
    where: { id: gymId, ownerUserId },
    data: { paymentLink: link, paymentAlias: alias, paymentPlanLink: planLink, paymentPlanAmount: planAmount },
  });
  return res.count > 0 ? 'ok' : 'NOT_OWNER';
}

/** Dirección de la página web del gimnasio (la que abre el QR "Activar plan"). Null si todavía no tiene código. */
export function gymLandingUrl(inviteCode: string | null | undefined, base = process.env.MAIN_APP_URL): string | null {
  const code = (inviteCode ?? '').trim();
  if (!/^[A-Z0-9]{4,20}$/i.test(code)) return null;
  const b = (base?.trim() || 'https://www.forzaai.app').replace(/\/+$/, '');
  return `${b}/g/${encodeURIComponent(code.toUpperCase())}`;
}
