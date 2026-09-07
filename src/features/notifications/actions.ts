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
  enabled: z.boolean().optional(),
  /** 1 = lunes … 7 = domingo (sólo aplica a recordatorios semanales). */
  dayOfWeek: z.number().int().min(1).max(7).optional(),
});

export async function setNotificationPref(raw: z.infer<typeof schema>): Promise<Result> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { kind, enabled, dayOfWeek } = parsed.data;
  if (enabled === undefined && dayOfWeek === undefined) return { ok: true };

  const { userId } = await requireUser();
  const db = forUser(userId);

  const data: { enabled?: boolean; dayOfWeek?: number } = {};
  if (enabled !== undefined) data.enabled = enabled;
  if (dayOfWeek !== undefined) data.dayOfWeek = dayOfWeek;

  const updated = await db.notificationPreference.updateMany({ where: { kind }, data });
  if (updated.count === 0) {
    await db.notificationPreference.create({
      data: {
        userId,
        kind,
        enabled: enabled ?? true,
        dayOfWeek: dayOfWeek ?? (kind === 'WEEKLY_CHECKIN' ? 1 : null),
      },
    });
  }
  revalidatePath('/settings/notifications');
  revalidatePath('/dashboard');
  return { ok: true };
}
