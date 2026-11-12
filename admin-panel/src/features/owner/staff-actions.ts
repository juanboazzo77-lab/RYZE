'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireOwner } from '@/lib/owner';
import { addStaff, removeStaff } from '@/server/gym-staff';

export type StaffActionError = 'INVALID' | 'NOT_OWNER' | 'EMAIL' | 'ROLE' | 'TOO_MANY' | 'IS_OWNER' | 'NOT_CONFIGURED' | 'CREATE_FAILED' | 'NOT_FOUND';
export type StaffActionResult = { ok: true; emailSent?: boolean; created?: boolean } | { error: StaffActionError };

const addSchema = z.object({ email: z.string().max(300), role: z.string().max(20) });

/** El dueño le da acceso a una persona de su equipo. Solo el dueño (el rol se comprueba en requireOwner). */
export async function addStaffAction(raw: z.input<typeof addSchema>): Promise<StaffActionResult> {
  const parsed = addSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, gym } = await requireOwner({ ownerOnly: true });
  const res = await addStaff(userId, gym.id, parsed.data);
  revalidatePath('/gym/equipo');
  return res;
}

export async function removeStaffAction(raw: { id: string }): Promise<StaffActionResult> {
  const id = z.string().uuid().safeParse(raw.id);
  if (!id.success) return { error: 'INVALID' };
  const { userId, gym } = await requireOwner({ ownerOnly: true });
  const ok = await removeStaff(userId, gym.id, id.data);
  revalidatePath('/gym/equipo');
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}
