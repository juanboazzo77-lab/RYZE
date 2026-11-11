'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireOwner } from '@/lib/owner';
import { removePlan, savePlan } from '@/server/gym-plans';

export type PlanActionError = 'INVALID' | 'NOT_OWNER' | 'NOT_FOUND' | 'NAME' | 'PRICE' | 'CLASSES' | 'LIMIT' | 'TOO_MANY' | 'DUPLICATE';
interface Result {
  ok?: boolean;
  error?: PlanActionError;
}

const input = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().max(200),
  description: z.string().max(500),
  price: z.string().max(20),
  classesMode: z.enum(['ALL', 'SELECTED']),
  classNames: z.array(z.string().max(100)).max(60),
  weeklyLimit: z.string().max(4),
});

const refresh = () => {
  revalidatePath('/gym/planes');
  revalidatePath('/gym/clientes');
};

/** Crea un plan (id null) o cambia uno existente del gimnasio de esta cuenta. */
export async function savePlanAction(raw: z.input<typeof input>): Promise<Result> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, gym } = await requireOwner();
  const { id, ...rest } = parsed.data;
  const res = await savePlan(userId, gym.id, id, rest);
  refresh();
  return 'ok' in res ? { ok: true } : { error: res.error };
}

/** Borra un plan: sus clientes quedan sin plan asignado. */
export async function removePlanAction(raw: { id: string }): Promise<Result> {
  const id = z.string().uuid().safeParse(raw.id);
  if (!id.success) return { error: 'INVALID' };
  const { userId, gym } = await requireOwner();
  const ok = await removePlan(userId, gym.id, id.data);
  refresh();
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}
