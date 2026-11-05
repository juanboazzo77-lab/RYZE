'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { isAdmin } from '@/server/admin';
import {
  approveGym,
  leaveGym,
  redeemGymCode,
  regenerateGymCode,
  rejectGym,
  setGymSuspended,
  setMemberLimit,
} from '@/server/gyms';
import type { JoinError } from './logic';

interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

const uuid = z.string().uuid();
const limit = z.number().int().min(1).max(20_000);

/** Sólo el administrador toca los gimnasios: se comprueba en cada acción, no sólo en la pantalla. */
async function requireAdmin() {
  const ctx = await requireUser();
  if (!isAdmin(ctx.email)) throw new Error('NOT_ADMIN');
  return ctx;
}

const refresh = () => revalidatePath('/admin/gyms');

/* --- Admin --- */

export async function adminApproveGym(raw: { gymId: string; memberLimit: number }): Promise<Result<{ code: string }>> {
  await requireAdmin();
  const id = uuid.safeParse(raw.gymId);
  const n = limit.safeParse(raw.memberLimit);
  if (!id.success || !n.success) return { error: 'INVALID' };
  const res = await approveGym(id.data, n.data);
  refresh();
  return 'ok' in res ? { ok: true, data: { code: res.code } } : { error: res.error };
}

export async function adminRejectGym(raw: { gymId: string }): Promise<Result> {
  await requireAdmin();
  const id = uuid.safeParse(raw.gymId);
  if (!id.success) return { error: 'INVALID' };
  const ok = await rejectGym(id.data);
  refresh();
  return ok ? { ok: true } : { error: 'NOT_AVAILABLE' };
}

export async function adminSetSuspended(raw: { gymId: string; suspended: boolean }): Promise<Result> {
  await requireAdmin();
  const id = uuid.safeParse(raw.gymId);
  if (!id.success) return { error: 'INVALID' };
  const ok = await setGymSuspended(id.data, raw.suspended === true);
  refresh();
  return ok ? { ok: true } : { error: 'NOT_AVAILABLE' };
}

export async function adminSetLimit(raw: { gymId: string; memberLimit: number }): Promise<Result> {
  await requireAdmin();
  const id = uuid.safeParse(raw.gymId);
  const n = limit.safeParse(raw.memberLimit);
  if (!id.success || !n.success) return { error: 'INVALID' };
  const ok = await setMemberLimit(id.data, n.data);
  refresh();
  return ok ? { ok: true } : { error: 'NOT_AVAILABLE' };
}

export async function adminRegenerateCode(raw: { gymId: string }): Promise<Result<{ code: string }>> {
  await requireAdmin();
  const id = uuid.safeParse(raw.gymId);
  if (!id.success) return { error: 'INVALID' };
  const code = await regenerateGymCode(id.data);
  refresh();
  return code ? { ok: true, data: { code } } : { error: 'NOT_AVAILABLE' };
}

/* --- Socio --- */

const codeSchema = z.string().trim().min(4).max(30);

export async function joinGym(raw: { code: string }): Promise<Result<{ gymName: string }> & { reason?: JoinError }> {
  const code = codeSchema.safeParse(raw.code);
  if (!code.success) return { error: 'INVALID', reason: 'INVALID_CODE' };
  const { userId } = await requireUser();
  const res = await redeemGymCode(userId, code.data);
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
