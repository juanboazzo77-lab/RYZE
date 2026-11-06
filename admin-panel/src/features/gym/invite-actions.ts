'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { approveInvites, markInvitesPaid, rejectInvites, resendInvite, type ApproveResult } from '@/server/invites';

const ids = z.array(z.string().uuid()).min(1).max(500);

const refresh = () => {
  revalidatePath('/altas');
  revalidatePath('/');
};

/** Aprueba altas de socios (respeta el cupo de cada gimnasio) y manda las invitaciones por mail. */
export async function adminApproveInvites(raw: { ids: string[] }): Promise<{ ok?: boolean; error?: string; result?: ApproveResult }> {
  await requireAdmin();
  const parsed = ids.safeParse(raw.ids);
  if (!parsed.success) return { error: 'INVALID' };
  const result = await approveInvites(parsed.data);
  refresh();
  return { ok: true, result };
}

export async function adminRejectInvites(raw: { ids: string[] }): Promise<{ ok?: boolean; error?: string; count?: number }> {
  await requireAdmin();
  const parsed = ids.safeParse(raw.ids);
  if (!parsed.success) return { error: 'INVALID' };
  const count = await rejectInvites(parsed.data);
  refresh();
  return { ok: true, count };
}

export async function adminResendInvite(raw: { id: string }): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin();
  const id = z.string().uuid().safeParse(raw.id);
  if (!id.success) return { error: 'INVALID' };
  const sent = await resendInvite(id.data);
  refresh();
  return sent ? { ok: true } : { error: 'SEND_FAILED' };
}

/** El admin confirma que el gimnasio pagó estas altas (o lo desmarca). */
export async function adminMarkInvitesPaid(raw: { ids: string[]; paid: boolean }): Promise<{ ok?: boolean; error?: string; count?: number }> {
  await requireAdmin();
  const parsed = ids.safeParse(raw.ids);
  if (!parsed.success) return { error: 'INVALID' };
  const count = await markInvitesPaid(parsed.data, raw.paid === true);
  refresh();
  return { ok: true, count };
}
