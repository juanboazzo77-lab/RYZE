import 'server-only';
import type { EntitlementTier } from '@prisma/client';
import type { PlanDuration } from '@/features/billing/plan-durations';
import { prisma } from '@/server/db';

const API = 'https://api.lemonsqueezy.com/v1';

function apiKey(): string {
  const key = process.env.LEMONSQUEEZY_API_KEY;
  if (!key) throw new Error('LEMONSQUEEZY_API_KEY no configurado');
  return key;
}

function storeId(): string {
  const id = process.env.LEMONSQUEEZY_STORE_ID;
  if (!id) throw new Error('LEMONSQUEEZY_STORE_ID no configurado');
  return id;
}

export function lemonSqueezyConfigured(): boolean {
  return !!process.env.LEMONSQUEEZY_API_KEY && !!process.env.LEMONSQUEEZY_STORE_ID;
}

async function lsFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      ...init?.headers,
    },
  });
}

/**
 * Variant ID de Lemon Squeezy para un tier+duración (ver .env.example). BASIC
 * solo tiene "monthly".
 */
const VARIANT_ENV: Record<'BASIC' | 'PRO' | 'COACH', Partial<Record<PlanDuration, string | undefined>>> = {
  BASIC: { monthly: process.env.LEMONSQUEEZY_VARIANT_BASIC_MONTHLY },
  PRO: {
    monthly: process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY,
    '3month': process.env.LEMONSQUEEZY_VARIANT_PRO_3MONTH,
    '6month': process.env.LEMONSQUEEZY_VARIANT_PRO_6MONTH,
    '12month': process.env.LEMONSQUEEZY_VARIANT_PRO_12MONTH,
  },
  COACH: {
    monthly: process.env.LEMONSQUEEZY_VARIANT_COACH_MONTHLY,
    '3month': process.env.LEMONSQUEEZY_VARIANT_COACH_3MONTH,
    '6month': process.env.LEMONSQUEEZY_VARIANT_COACH_6MONTH,
    '12month': process.env.LEMONSQUEEZY_VARIANT_COACH_12MONTH,
  },
};

export function variantIdFor(tier: 'BASIC' | 'PRO' | 'COACH', duration: PlanDuration): string | null {
  return VARIANT_ENV[tier][duration] ?? null;
}

function tierForVariantId(variantId: number | string): EntitlementTier | null {
  const id = String(variantId);
  for (const [tier, byDuration] of Object.entries(VARIANT_ENV) as Array<
    [keyof typeof VARIANT_ENV, (typeof VARIANT_ENV)[keyof typeof VARIANT_ENV]]
  >) {
    if (Object.values(byDuration).includes(id)) return tier;
  }
  return null;
}

/** Crea un checkout de Lemon Squeezy y devuelve la URL a la que redirigir. */
export async function createLemonSqueezyCheckout(
  userId: string,
  email: string,
  tier: 'BASIC' | 'PRO' | 'COACH',
  duration: PlanDuration,
  redirectUrl: string,
): Promise<string> {
  const variantId = variantIdFor(tier, duration);
  if (!variantId) throw new Error(`Sin variant configurado para ${tier}/${duration}`);

  const res = await lsFetch('/checkouts', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email,
            custom: { user_id: userId },
          },
          product_options: { redirect_url: redirectUrl },
        },
        relationships: {
          store: { data: { type: 'stores', id: storeId() } },
          variant: { data: { type: 'variants', id: variantId } },
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Lemon Squeezy checkout falló: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { data: { attributes: { url: string } } };
  return json.data.attributes.url;
}

interface LemonSqueezySubscription {
  data: {
    id: string;
    attributes: {
      status: string;
      variant_id: number;
      customer_id: number;
      renews_at: string | null;
      ends_at: string | null;
      urls: { customer_portal: string };
    };
  };
}

const ACTIVE_STATUSES = new Set(['active', 'on_trial']);

/**
 * Re-consulta el estado real de una suscripción de Lemon Squeezy (nunca
 * interpreta el payload del webhook a mano — mismo patrón que RevenueCat/
 * Stripe) y sincroniza `entitlement` para el usuario dueño.
 */
export async function syncEntitlementFromLemonSqueezySubscription(
  subscriptionId: string,
  userId: string,
): Promise<void> {
  const res = await lsFetch(`/subscriptions/${subscriptionId}`);
  if (!res.ok) {
    throw new Error(`Lemon Squeezy GET subscription falló: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as LemonSqueezySubscription;
  const { status, variant_id, customer_id, renews_at, ends_at } = json.data.attributes;

  const tier = ACTIVE_STATUSES.has(status) ? tierForVariantId(variant_id) : null;

  await prisma.entitlement.update({
    where: { userId },
    data: {
      tier: tier ?? 'FREE',
      status: 'ACTIVE',
      currentPeriodEnd: renews_at ? new Date(renews_at) : ends_at ? new Date(ends_at) : null,
      lemonSqueezyCustomerId: String(customer_id),
      lemonSqueezySubscriptionId: subscriptionId,
    },
  });
}

/** URL del portal de cliente (cambiar método de pago, cancelar) para el usuario, si tiene suscripción. */
export async function getLemonSqueezyPortalUrl(userId: string): Promise<string | null> {
  const entitlement = await prisma.entitlement.findUnique({ where: { userId } });
  if (!entitlement?.lemonSqueezySubscriptionId) return null;

  const res = await lsFetch(`/subscriptions/${entitlement.lemonSqueezySubscriptionId}`);
  if (!res.ok) return null;
  const json = (await res.json()) as LemonSqueezySubscription;
  return json.data.attributes.urls.customer_portal;
}
