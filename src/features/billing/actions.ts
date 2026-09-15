'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/server/context';
import { syncEntitlementFromRevenueCat } from '@/server/billing/revenuecat';

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
