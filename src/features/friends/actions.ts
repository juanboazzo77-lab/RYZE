'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { redeemCode, removeFriend, REFERRAL_BONUS_DAYS } from '@/server/friends';

export interface RedeemActionResult {
  ok?: boolean;
  error?: 'INVALID' | 'NOT_FOUND' | 'SELF' | 'ALREADY_FRIENDS' | 'GENERIC';
  friendName?: string;
  rewarded?: boolean;
  days?: number;
}

const codeSchema = z.object({ code: z.string().trim().min(1).max(40) });

export async function redeemCodeAction(raw: { code: string }): Promise<RedeemActionResult> {
  const parsed = codeSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  try {
    const res = await redeemCode(userId, parsed.data.code);
    if (!res.ok) return { error: res.error };
    revalidatePath('/progress/friends');
    revalidatePath('/settings/plans');
    return { ok: true, friendName: res.friendName, rewarded: res.rewarded, days: REFERRAL_BONUS_DAYS };
  } catch (e) {
    console.error('[friends] redeem falló', e instanceof Error ? e.message : e);
    return { error: 'GENERIC' };
  }
}

export async function removeFriendAction(raw: { friendId: string }): Promise<{ ok?: boolean; error?: string }> {
  const parsed = z.object({ friendId: z.string().uuid() }).safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  await removeFriend(userId, parsed.data.friendId);
  revalidatePath('/progress/friends');
  return { ok: true };
}
