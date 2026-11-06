'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { getOwnedGym, leaveGym, redeemGymCode, saveOwnGymProfile, setShareActivity } from '@/server/gyms';
import type { JoinError } from './logic';

interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

const codeSchema = z.string().trim().min(4).max(30);

/** El socio entra a su gimnasio con el código. */
export async function joinGym(raw: { code: string; share?: boolean }): Promise<Result<{ gymName: string }> & { reason?: JoinError }> {
  const code = codeSchema.safeParse(raw.code);
  if (!code.success) return { error: 'INVALID', reason: 'INVALID_CODE' };
  const { userId } = await requireUser();
  const res = await redeemGymCode(userId, code.data, raw.share === true);
  revalidatePath('/settings');
  revalidatePath('/settings/gym');
  revalidatePath('/dashboard');
  return 'ok' in res ? { ok: true, data: { gymName: res.gymName } } : { error: res.error, reason: res.error };
}

export async function leaveMyGym(): Promise<Result> {
  const { userId } = await requireUser();
  await leaveGym(userId);
  revalidatePath('/settings');
  revalidatePath('/settings/gym');
  revalidatePath('/dashboard');
  return { ok: true };
}

/* --- Dueño del gimnasio --- */

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
  const { userId } = await requireUser();
  const gym = await getOwnedGym(userId);
  if (!gym) return { error: 'NOT_OWNER' };
  const ok = await saveOwnGymProfile(userId, gym.id, parsed.data);
  revalidatePath('/settings/my-gym');
  return ok ? { ok: true } : { error: 'NOT_OWNER' };
}

/* --- Permiso del socio --- */

/** El socio decide si su gimnasio ve su nombre y su actividad. */
export async function setMyShareActivity(raw: { share: boolean }): Promise<Result> {
  const { userId } = await requireUser();
  const ok = await setShareActivity(userId, raw.share === true);
  revalidatePath('/settings/gym');
  return ok ? { ok: true } : { error: 'NOT_MEMBER' };
}
