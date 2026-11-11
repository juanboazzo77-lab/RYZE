'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/server/context';
import { leaveGym, setShareActivity } from '@/server/gyms';
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
