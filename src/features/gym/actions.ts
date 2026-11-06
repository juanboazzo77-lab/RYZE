'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { acceptInvite, getOwnedGym, leaveGym, requestInvites, saveOwnGymProfile, setShareActivity } from '@/server/gyms';
import type { JoinError } from './logic';

interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

/** El socio entra a su gimnasio con el código. */
export async function joinGym(_raw: { code: string; share?: boolean }): Promise<Result<{ gymName: string }> & { reason?: JoinError }> {
  // Entrar con un código quedó desactivado: un socio sólo entra por la invitación que el administrador aprobó
  // (con el comprobante de pago del alta). Así nadie se suma a un gimnasio sin esa autorización.
  return { error: 'DISABLED', reason: 'INVALID_CODE' };
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

/* --- Invitaciones por mail --- */

/**
 * El dueño pide el alta de sus clientes (una lista de mails). El pago lo manda por fuera (mail o WhatsApp) y el
 * administrador lo confirma: sin pago confirmado no se aprueba ninguna alta.
 */
export async function inviteMembers(raw: { list: string }): Promise<
  Result<{ added: number; skipped: number; invalid: string[] }> & { error?: 'INVALID' | 'NOT_OWNER' | 'NOT_ACTIVE' | 'EMPTY' | 'TOO_MANY' }
> {
  const list = z.string().max(40_000).safeParse(raw.list);
  if (!list.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const gym = await getOwnedGym(userId);
  if (!gym) return { error: 'NOT_OWNER' };
  const res = await requestInvites(userId, gym.id, list.data);
  revalidatePath('/gym/invitaciones');
  revalidatePath('/gym');
  return 'error' in res ? { error: res.error } : { ok: true, data: { added: res.added, skipped: res.skipped, invalid: res.invalid } };
}

/** La persona acepta la invitación de su gimnasio (con su elección de compartir o no su actividad). */
export async function acceptMyInvite(raw: { inviteId: string; share: boolean }): Promise<Result<{ gymName: string }> & { error?: string }> {
  const id = z.string().uuid().safeParse(raw.inviteId);
  if (!id.success) return { error: 'INVALID' };
  const { userId, email } = await requireUser();
  const res = await acceptInvite(userId, email, id.data, raw.share === true);
  revalidatePath('/dashboard');
  revalidatePath('/settings');
  return 'ok' in res ? { ok: true, data: { gymName: res.gymName } } : { error: res.error };
}

/** "Ahora no": no se la vuelve a mostrar durante unas horas. */
export async function skipInvite(): Promise<void> {
  (await cookies()).set('fz_invite_skip', '1', { path: '/', maxAge: 60 * 60 * 12, sameSite: 'lax', httpOnly: true, secure: true });
}
