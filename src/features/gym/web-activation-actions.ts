'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/server/context';
import { getGymLanding, recordGymReferral, webPurchaseProblem, webPurchaseUrlFor } from '@/server/gym-referrals';

export interface ActivationState {
  error?: 'NOT_FOUND' | 'NOT_READY';
}

/**
 * "Activar mi plan" en la página web del gimnasio: anota de qué gimnasio viene la persona y la lleva al pago de la
 * web. Si el pago de la web todavía no está habilitado, avisa en la misma pantalla (no cobra nada).
 */
export async function activateGymPlan(_prev: ActivationState, formData: FormData): Promise<ActivationState> {
  const ctx = await requireUser();
  const gym = await getGymLanding(String(formData.get('code') ?? ''));
  if (!gym) return { error: 'NOT_FOUND' };
  await recordGymReferral(ctx.userId, gym.id);
  const url = webPurchaseUrlFor(ctx.userId);
  if (!url) {
    // Queda en los registros del servidor para poder ver por qué (sin imprimir el valor, que tiene el token).
    console.error(`[gym-web] no hay enlace de compra: REVENUECAT_WEB_PURCHASE_URL ${webPurchaseProblem() === 'MISSING' ? 'no está configurada' : 'tiene un formato inválido'}`);
    return { error: 'NOT_READY' };
  }
  redirect(url);
}
