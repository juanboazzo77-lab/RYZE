'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireOwner } from '@/lib/owner';
import { requestInvites, saveOwnGymProfile } from '@/server/owner';

interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

const ownProfileSchema = z.object({
  specialty: z.string().max(40).nullable(),
  specialtyDetail: z.string().max(200),
  items: z.array(z.string().max(40)).max(120),
  notes: z.string().max(600),
});

/** El dueño guarda las máquinas y la especialidad de su gimnasio. Siempre sobre SU gimnasio, nunca el que mande el navegador. */
export async function saveMyGymProfile(raw: z.input<typeof ownProfileSchema>): Promise<Result> {
  const parsed = ownProfileSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, gym } = await requireOwner();
  const ok = await saveOwnGymProfile(userId, gym.id, parsed.data);
  revalidatePath('/gym/equipamiento');
  return ok ? { ok: true } : { error: 'NOT_OWNER' };
}

/**
 * El dueño pide el alta de sus clientes (una lista de mails). El pago lo manda por fuera (mail o WhatsApp) y el
 * administrador lo confirma: sin pago confirmado no se aprueba ninguna alta.
 */
export async function inviteMembers(raw: { list: string }): Promise<
  Result<{ added: number; skipped: number; invalid: string[] }> & { error?: 'INVALID' | 'NOT_OWNER' | 'NOT_ACTIVE' | 'EMPTY' | 'TOO_MANY' }
> {
  const list = z.string().max(40_000).safeParse(raw.list);
  if (!list.success) return { error: 'INVALID' };
  const { userId, gym } = await requireOwner();
  const res = await requestInvites(userId, gym.id, list.data);
  revalidatePath('/gym/invitaciones');
  revalidatePath('/gym');
  return 'error' in res ? { error: res.error } : { ok: true, data: { added: res.added, skipped: res.skipped, invalid: res.invalid } };
}
