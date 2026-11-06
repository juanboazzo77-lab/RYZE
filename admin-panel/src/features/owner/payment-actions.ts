'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireOwner } from '@/lib/owner';
import { savePaymentInfo } from '@/server/gym-payment';

/** El dueño guarda su link de pago y su alias. Siempre sobre SU gimnasio. */
export async function savePaymentAction(raw: { link: string; alias: string }): Promise<{ ok?: boolean; error?: 'INVALID' | 'INVALID_LINK' | 'INVALID_ALIAS' | 'NOT_OWNER' }> {
  const parsed = z.object({ link: z.string().max(600), alias: z.string().max(80) }).safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, gym } = await requireOwner();
  const res = await savePaymentInfo(userId, gym.id, parsed.data);
  revalidatePath('/gym/cobros/qr');
  return res === 'ok' ? { ok: true } : { error: res };
}
