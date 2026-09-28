'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/server/context';
import { syncEntitlementFromRevenueCat } from '@/server/billing/revenuecat';
import {
  createLemonSqueezyCheckout,
  getLemonSqueezyPortalUrl,
  lemonSqueezyConfigured,
  variantIdFor,
} from '@/server/billing/lemonsqueezy';
import type { PlanDuration } from './plan-durations';

/**
 * Llamada desde el cliente justo después de una compra o restauración exitosa
 * en RevenueCat, para no depender solo del webhook (que puede tardar unos
 * segundos en llegar) y que el usuario vea su plan nuevo al instante.
 */
export async function syncMyEntitlementAction(): Promise<void> {
  const ctx = await requireUser();
  await syncEntitlementFromRevenueCat(ctx.userId);
  revalidatePath('/settings/plans');
  revalidatePath('/settings');
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

export interface CheckoutResult {
  url?: string;
  error?: string;
}

/** Compra desde la web (navegador, no app nativa): Lemon Squeezy Checkout. */
export async function createCheckoutAction(
  tier: 'BASIC' | 'PRO' | 'COACH',
  duration: PlanDuration,
): Promise<CheckoutResult> {
  if (!lemonSqueezyConfigured()) return { error: 'LEMONSQUEEZY_NOT_CONFIGURED' };
  if (!variantIdFor(tier, duration)) return { error: 'PRICE_NOT_CONFIGURED' };

  const { userId, email } = await requireUser();
  try {
    const url = await createLemonSqueezyCheckout(
      userId,
      email,
      tier,
      duration,
      `${appUrl()}/settings/plans?ls=success`,
    );
    return { url };
  } catch (e) {
    console.error('[billing] createLemonSqueezyCheckout falló', (e as Error).message);
    return { error: 'NO_URL' };
  }
}

/** Portal de Lemon Squeezy para que el usuario cambie método de pago o cancele. */
export async function createBillingPortalAction(): Promise<CheckoutResult> {
  const { userId } = await requireUser();
  const url = await getLemonSqueezyPortalUrl(userId);
  if (!url) return { error: 'NO_SUBSCRIPTION' };
  return { url };
}
