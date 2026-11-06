'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { acceptInvite, leaveGym, setShareActivity } from '@/server/gyms';
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

/* --- Permiso del socio --- */

/** El socio decide si su gimnasio ve su nombre y su actividad. */
export async function setMyShareActivity(raw: { share: boolean }): Promise<Result> {
  const { userId } = await requireUser();
  const ok = await setShareActivity(userId, raw.share === true);
  revalidatePath('/settings/gym');
  return ok ? { ok: true } : { error: 'NOT_MEMBER' };
}

/* --- Invitaciones por mail --- */

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
