'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { bookClass, cancelBooking, joinWaitlist, leaveWaitlist } from '@/server/gym-classes';

interface Result {
  ok?: boolean;
  error?: string;
}

const schema = z.object({ classId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

const refresh = () => {
  revalidatePath('/training/gym/clases');
  revalidatePath('/dashboard');
};

/** El socio reserva un lugar en una clase de SU gimnasio. */
export async function bookMyClass(raw: { classId: string; date: string }): Promise<Result> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const ctx = await requireUser();
  if (!ctx.gym) return { error: 'NOT_MEMBER' };
  const res = await bookClass(ctx.userId, ctx.gym.gymId, parsed.data.classId, parsed.data.date);
  refresh();
  return res === 'ok' ? { ok: true } : { error: res };
}

/** Cancela su reserva (hasta 2 horas antes). */
export async function cancelMyClass(raw: { classId: string; date: string }): Promise<Result> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const ctx = await requireUser();
  if (!ctx.gym) return { error: 'NOT_MEMBER' };
  const res = await cancelBooking(ctx.userId, ctx.gym.gymId, parsed.data.classId, parsed.data.date);
  refresh();
  return res === 'ok' ? { ok: true } : { error: res };
}

/** Se anota en la lista de espera de una clase completa. */
export async function joinMyWaitlist(raw: { classId: string; date: string }): Promise<Result> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const ctx = await requireUser();
  if (!ctx.gym) return { error: 'NOT_MEMBER' };
  const res = await joinWaitlist(ctx.userId, ctx.gym.gymId, parsed.data.classId, parsed.data.date);
  refresh();
  return res === 'ok' ? { ok: true } : { error: res };
}

/** Sale de la lista de espera. */
export async function leaveMyWaitlist(raw: { classId: string; date: string }): Promise<Result> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const ctx = await requireUser();
  if (!ctx.gym) return { error: 'NOT_MEMBER' };
  const ok = await leaveWaitlist(ctx.userId, ctx.gym.gymId, parsed.data.classId, parsed.data.date);
  refresh();
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}
