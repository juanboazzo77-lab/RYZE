'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { getOwnedGym } from '@/server/gyms';
import { addClients, markClientPaid, removeClient, requestForzaFor, updateClient } from '@/server/gym-clients';
import { parseClientLines } from './fees';

interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

const uuid = z.string().uuid();
const refresh = () => {
  revalidatePath('/gym/clientes');
  revalidatePath('/gym');
};

/** El dueño carga clientes pegando una lista: "Nombre, mail, teléfono, cuota, vencimiento", una por línea. */
export async function addGymClients(raw: { text: string }): Promise<Result<{ added: number; skipped: number; invalid: string[] }>> {
  const text = z.string().max(100_000).safeParse(raw.text);
  if (!text.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const gym = await getOwnedGym(userId);
  if (!gym) return { error: 'NOT_OWNER' };
  const { valid, invalid } = parseClientLines(text.data);
  const res = await addClients(userId, gym.id, valid);
  refresh();
  if ('error' in res) return { error: res.error };
  return { ok: true, data: { added: res.added, skipped: res.skipped, invalid } };
}

/** El cliente pagó: el vencimiento corre uno o más meses. */
export async function markGymClientPaid(raw: { id: string; months?: number; amount?: number | null }): Promise<Result<{ paidUntil: string }>> {
  const id = uuid.safeParse(raw.id);
  if (!id.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const res = await markClientPaid(userId, id.data, { months: raw.months, amount: raw.amount });
  refresh();
  return 'ok' in res ? { ok: true, data: { paidUntil: res.paidUntil } } : { error: res.error };
}

const editSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(120).optional(),
  email: z.string().max(200).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  feeAmount: z.number().min(0).max(100_000_000).nullable().optional(),
  paidUntil: z.string().max(10).nullable().optional(),
});

export async function editGymClient(raw: z.input<typeof editSchema>): Promise<Result> {
  const parsed = editSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { id, ...patch } = parsed.data;
  if (patch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(patch.email.trim())) return { error: 'INVALID_EMAIL' };
  const { userId } = await requireUser();
  const ok = await updateClient(userId, id, patch);
  refresh();
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}

export async function removeGymClient(raw: { id: string }): Promise<Result> {
  const id = uuid.safeParse(raw.id);
  if (!id.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const ok = await removeClient(userId, id.data);
  refresh();
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}

/** Pide Forza AI para estos clientes: entra al circuito de altas (pago y aprobación). */
export async function requestForzaForClients(raw: { ids: string[] }): Promise<Result<{ added: number; skipped: number }>> {
  const ids = z.array(z.string().uuid()).min(1).max(200).safeParse(raw.ids);
  if (!ids.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const gym = await getOwnedGym(userId);
  if (!gym) return { error: 'NOT_OWNER' };
  const res = await requestForzaFor(userId, gym.id, ids.data);
  refresh();
  revalidatePath('/gym/invitaciones');
  return 'error' in res ? { error: res.error } : { ok: true, data: { added: res.added, skipped: res.skipped } };
}
