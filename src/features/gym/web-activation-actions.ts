'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/server/context';
import { getGymLanding, recordGymReferral } from '@/server/gym-referrals';
import { startSubscription } from '@/server/billing/mercadopago';
import { normalizeGymCode } from '@/features/gym/logic';

export interface ActivationState {
  error?: 'NOT_FOUND' | 'NOT_READY' | 'FAILED' | 'ALREADY_ACTIVE';
}

/**
 * "Activar mi plan" en la página web del gimnasio: anota de qué gimnasio viene la persona, crea su suscripción
 * mensual en Mercado Pago (en pesos) y la lleva a pagarla allá. El plan se activa solo cuando Mercado Pago avisa
 * que el pago está autorizado.
 */
export async function activateGymPlan(_prev: ActivationState, formData: FormData): Promise<ActivationState> {
  const ctx = await requireUser();
  const code = normalizeGymCode(String(formData.get('code') ?? ''));
  const gym = code ? await getGymLanding(code) : null;
  if (!code || !gym) return { error: 'NOT_FOUND' };
  await recordGymReferral(ctx.userId, gym.id);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.forzaai.app';
  const res = await startSubscription({ userId: ctx.userId, email: ctx.email, gymId: gym.id, backUrl: `${base.replace(/\/+$/, '')}/g/${encodeURIComponent(code)}?pago=ok` });
  if ('ok' in res) redirect(res.url);
  return { error: res.error === 'NOT_CONFIGURED' ? 'NOT_READY' : res.error };
}
