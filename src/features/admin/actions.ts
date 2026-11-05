'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { isAdmin } from '@/server/admin';
import { setErrorStatus } from '@/server/app-errors';
import { setGymPrice, setPaymentPaid } from '@/server/gym-billing';

interface Result {
  ok?: boolean;
  error?: string;
}

const uuid = z.string().uuid();

/** Sólo el administrador: se comprueba en cada acción, no sólo en la pantalla. */
async function requireAdmin() {
  const ctx = await requireUser();
  if (!isAdmin(ctx.email)) throw new Error('NOT_ADMIN');
}

export async function resolveError(raw: { id: string; resolved: boolean }): Promise<Result> {
  await requireAdmin();
  const id = uuid.safeParse(raw.id);
  if (!id.success) return { error: 'INVALID' };
  const ok = await setErrorStatus(id.data, raw.resolved ? 'RESOLVED' : 'OPEN');
  revalidatePath('/admin/errores');
  revalidatePath('/admin');
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}

export async function markPaymentPaid(raw: { id: string; paid: boolean; note?: string }): Promise<Result> {
  await requireAdmin();
  const id = uuid.safeParse(raw.id);
  if (!id.success) return { error: 'INVALID' };
  const ok = await setPaymentPaid(id.data, raw.paid, raw.note);
  revalidatePath('/admin/cobros');
  revalidatePath('/admin');
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}

export async function updateGymPrice(raw: { gymId: string; price: number }): Promise<Result> {
  await requireAdmin();
  const id = uuid.safeParse(raw.gymId);
  const price = z.number().min(0).max(1000).safeParse(raw.price);
  if (!id.success || !price.success) return { error: 'INVALID' };
  const ok = await setGymPrice(id.data, price.data);
  revalidatePath('/admin/cobros');
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}
