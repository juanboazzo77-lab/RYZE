'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/server/context';
import { getGymLanding, recordGymReferral, webPurchaseUrlFor } from '@/server/gym-referrals';

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
  if (!url) return { error: 'NOT_READY' };
  redirect(url);
}
