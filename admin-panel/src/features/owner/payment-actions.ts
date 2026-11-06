'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireOwner } from '@/lib/owner';
import { savePaymentInfo, type SavePaymentResult } from '@/server/gym-payment';

const schema = z.object({
  link: z.string().max(600),
  alias: z.string().max(80),
  planLink: z.string().max(600),
  planAmount: z.string().max(20),
});

/** El dueño guarda sus datos de cobro (cuota y plan de rutina con IA). Siempre sobre SU gimnasio. */
export async function savePaymentAction(raw: z.input<typeof schema>): Promise<{ ok?: boolean; error?: Exclude<SavePaymentResult, 'ok'> | 'INVALID' }> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, gym } = await requireOwner();
  const res = await savePaymentInfo(userId, gym.id, parsed.data);
  revalidatePath('/gym/cobros/qr');
  return res === 'ok' ? { ok: true } : { error: res };
}
