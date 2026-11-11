'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireOwner } from '@/lib/owner';
import { saveOwnGymProfile } from '@/server/owner';

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
