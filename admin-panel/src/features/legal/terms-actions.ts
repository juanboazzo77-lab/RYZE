'use server';

import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/lib/owner';
import { acceptTerms } from '@/server/gym-terms';

/** El dueño acepta los términos para gimnasios. */
export async function acceptTermsAction(): Promise<{ ok?: boolean; error?: string }> {
  const { userId, gym } = await requireOwner({ ownerOnly: true });
  const ok = await acceptTerms(userId, gym.id);
  revalidatePath('/gym', 'layout');
  return ok ? { ok: true } : { error: 'NOT_OWNER' };
}
