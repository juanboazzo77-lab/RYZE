'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { isoToUtcDate, localTodayISO } from '@/lib/date';

export interface Result {
  ok?: boolean;
  error?: string;
}

const logSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.number().min(20).max(500),
  note: z.string().trim().max(200).optional(),
});
export type LogWeightInput = z.infer<typeof logSchema>;

function refresh() {
  revalidatePath('/progress');
  revalidatePath('/dashboard');
}

/** Alta o edición del peso de un día (uno por fecha). */
export async function logWeight(raw: LogWeightInput): Promise<Result> {
  const parsed = logSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const d = parsed.data;
  const { userId, profile } = await requireUser();
  const db = forUser(userId);
  const date = isoToUtcDate(d.date);

  const updated = await db.weightEntry.updateMany({
    where: { date },
    data: { weightKg: d.weightKg, note: d.note || null },
  });
  if (updated.count === 0) {
    await db.weightEntry.create({
      data: { userId, date, weightKg: d.weightKg, note: d.note || null },
    });
  }
  const { syncAchievements } = await import('@/features/gamification/sync');
  await syncAchievements(db, userId, profile.timezone);
  refresh();
  return { ok: true };
}

/** Para el aviso de la mañana (apps nativas): si ya registró el peso hoy y si tiene el recordatorio activado. */
export async function getWeighInStatus(): Promise<{ weighedToday: boolean; enabled: boolean }> {
  const { userId, profile } = await requireUser();
  const db = forUser(userId);
  const today = isoToUtcDate(localTodayISO(profile.timezone));
  const [entry, pref] = await Promise.all([
    db.weightEntry.findFirst({ where: { date: today }, select: { id: true } }),
    db.notificationPreference.findFirst({ where: { kind: 'WEIGH_IN' }, select: { enabled: true } }),
  ]);
  return { weighedToday: Boolean(entry), enabled: pref?.enabled ?? true };
}

export async function deleteWeightEntry(raw: { id: string }): Promise<Result> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  await forUser(userId).weightEntry.deleteMany({ where: { id: parsed.data.id } });
  refresh();
  return { ok: true };
}
