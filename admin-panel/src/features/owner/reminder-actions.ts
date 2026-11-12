'use server';

import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/lib/owner';
import { prisma } from '@/server/db';

/** El dueño prende o apaga los recordatorios automáticos de cuota a sus clientes. */
export async function setClientRemindersAction(raw: { on: boolean }): Promise<{ ok?: boolean }> {
  const { userId, gym } = await requireOwner();
  const res = await prisma.gym.updateMany({ where: { id: gym.id, ownerUserId: userId }, data: { clientReminders: raw.on === true } });
  revalidatePath('/gym/cobros');
  return res.count > 0 ? { ok: true } : {};
}
