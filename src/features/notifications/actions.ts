'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';

export interface Result {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  kind: z.enum(['WEIGH_IN', 'WORKOUT_TODAY', 'LOG_MEALS', 'WEEKLY_CHECKIN', 'PROTEIN_GOAL', 'STREAK']),
  enabled: z.boolean(),
});

export async function setNotificationPref(raw: z.infer<typeof schema>): Promise<Result> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { kind, enabled } = parsed.data;
  const { userId } = await requireUser();
  const db = forUser(userId);

  const updated = await db.notificationPreference.updateMany({ where: { kind }, data: { enabled } });
  if (updated.count === 0) {
    await db.notificationPreference.create({ data: { userId, kind, enabled } });
  }
  revalidatePath('/settings/notifications');
  return { ok: true };
}
