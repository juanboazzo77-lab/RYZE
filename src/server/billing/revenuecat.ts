import 'server-only';
import type { EntitlementTier } from '@prisma/client';
import { prisma } from '@/server/db';

/**
 * Entitlements de RevenueCat, de mayor a menor — deben coincidir con los
 * identificadores creados en el dashboard (Product catalog → Entitlements).
 * COACH ya incluye todo lo de PRO en `TIER_LIMITS`, así que no hace falta que
 * el producto coach_monthly otorgue también el entitlement "pro" en RC.
 */
const TIER_BY_RC_ENTITLEMENT: Array<{ rcId: string; tier: EntitlementTier }> = [
  { rcId: 'coach', tier: 'COACH' },
  { rcId: 'pro', tier: 'PRO' },
];

interface RevenueCatSubscriberEntitlement {
  expires_date: string | null;
}

interface RevenueCatSubscriberResponse {
  subscriber: {
    entitlements: Record<string, RevenueCatSubscriberEntitlement>;
  };
}

/**
 * Le pregunta a la API de RevenueCat (no al payload del webhook) cuál es el
 * estado real y actual del suscriptor. Es más confiable que interpretar el
 * `type` de cada evento a mano — RevenueCat recomienda este patrón porque los
 * webhooks pueden llegar reordenados o duplicados.
 */
async function fetchSubscriberState(
  appUserId: string,
): Promise<{ tier: EntitlementTier; currentPeriodEnd: Date | null }> {
  const secretKey = process.env.REVENUECAT_SECRET_API_KEY;
  if (!secretKey) throw new Error('REVENUECAT_SECRET_API_KEY no configurado');

  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  if (!res.ok) {
    throw new Error(`RevenueCat GET subscriber falló: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as RevenueCatSubscriberResponse;
  const entitlements = data.subscriber.entitlements;
  const now = Date.now();

  for (const { rcId, tier } of TIER_BY_RC_ENTITLEMENT) {
    const ent = entitlements[rcId];
    if (!ent) continue;
    const isActive = ent.expires_date === null || new Date(ent.expires_date).getTime() > now;
    if (isActive) {
      return { tier, currentPeriodEnd: ent.expires_date ? new Date(ent.expires_date) : null };
    }
  }
  return { tier: 'FREE', currentPeriodEnd: null };
}

/**
 * Sincroniza `entitlement` en nuestra base con el estado real de RevenueCat
 * para ese usuario. `appUserId` es el mismo valor que `userId` — configuramos
 * el SDK de RevenueCat para usar nuestro propio id como su `app_user_id`.
 */
export async function syncEntitlementFromRevenueCat(appUserId: string): Promise<void> {
  const { tier, currentPeriodEnd } = await fetchSubscriberState(appUserId);
  await prisma.entitlement.update({
    where: { userId: appUserId },
    data: { tier, status: 'ACTIVE', currentPeriodEnd },
  });
}
