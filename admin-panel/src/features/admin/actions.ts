'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { setErrorStatus } from '@/server/app-errors';
import { setGymPrice, setPaymentPaid } from '@/server/gym-billing';

interface Result {
  ok?: boolean;
  error?: string;
}

const uuid = z.string().uuid();

export async function resolveError(raw: { id: string; resolved: boolean }): Promise<Result> {
  await requireAdmin();
  const id = uuid.safeParse(raw.id);
  if (!id.success) return { error: 'INVALID' };
  const ok = await setErrorStatus(id.data, raw.resolved ? 'RESOLVED' : 'OPEN');
  revalidatePath('/errores');
  revalidatePath('/');
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}

export async function markPaymentPaid(raw: { id: string; paid: boolean; note?: string }): Promise<Result> {
  await requireAdmin();
  const id = uuid.safeParse(raw.id);
  if (!id.success) return { error: 'INVALID' };
  const ok = await setPaymentPaid(id.data, raw.paid, raw.note);
  revalidatePath('/cobros');
  revalidatePath('/');
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}

export async function updateGymPrice(raw: { gymId: string; price: number; currency: 'ARS' | 'USD' }): Promise<Result> {
  await requireAdmin();
  const id = uuid.safeParse(raw.gymId);
  const price = z.number().min(0).max(1_000_000).safeParse(raw.price);
  const currency = z.enum(['ARS', 'USD']).safeParse(raw.currency);
  if (!id.success || !price.success || !currency.success) return { error: 'INVALID' };
  const ok = await setGymPrice(id.data, price.data, currency.data);
  revalidatePath('/cobros');
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}
