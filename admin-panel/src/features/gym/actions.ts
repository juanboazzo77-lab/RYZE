'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { approveGym, regenerateGymCode, rejectGym, saveGymProfile, setGymSuspended, setMemberLimit } from '@/server/gyms';

interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

const uuid = z.string().uuid();
const limit = z.number().int().min(1).max(20_000);

const refresh = () => {
  revalidatePath('/gimnasios');
  revalidatePath('/');
};

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

const profileSchema = z.object({
  gymId: z.string().uuid(),
  specialty: z.string().max(40).nullable(),
  specialtyDetail: z.string().max(200),
  items: z.array(z.string().max(40)).max(120),
  notes: z.string().max(600),
});

export async function adminSaveGymProfile(raw: z.input<typeof profileSchema>): Promise<Result> {
  await requireAdmin();
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { gymId, ...rest } = parsed.data;
  const ok = await saveGymProfile(gymId, rest);
  refresh();
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}
