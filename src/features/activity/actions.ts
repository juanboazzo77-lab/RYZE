'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { isoToUtcDate } from '@/lib/date';
import { deleteActivitySchema, logActivitySchema, type LogActivityInput } from './schema';

export interface Result {
  ok?: boolean;
  error?: string;
}

function refresh() {
  revalidatePath('/progress');
  revalidatePath('/dashboard');
  revalidatePath('/checkin');
}

export async function logActivity(raw: LogActivityInput): Promise<Result> {
  const parsed = logActivitySchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { date, steps, activeMinutes } = parsed.data;
  const { userId } = await requireUser();
  const day = isoToUtcDate(date);

  // Upsert por (userId, date). `forUser` bloquea upsert; hacemos delete+create scopeado.
  const db = forUser(userId);
  await db.dailyActivity.deleteMany({ where: { date: day } });
  await db.dailyActivity.create({
    data: { userId, date: day, steps, activeMinutes: activeMinutes ?? null },
  });

  refresh();
  return { ok: true };
}

export async function deleteActivity(raw: { date: string }): Promise<Result> {
  const parsed = deleteActivitySchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  await forUser(userId).dailyActivity.deleteMany({ where: { date: isoToUtcDate(parsed.data.date) } });
  refresh();
  return { ok: true };
}
