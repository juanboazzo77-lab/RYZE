'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { can } from '@/server/entitlements';
import { isoToUtcDate, localTodayISO, weekStartISO } from '@/lib/date';
import { buildCheckinSummary } from '@/lib/checkin/summary';
import { computeWeekStats } from './queries';

export interface Result {
  ok?: boolean;
  error?: string;
}

const scale = z.number().int().min(1).max(5).nullable();

const submitSchema = z.object({
  hunger: scale,
  energy: scale,
  sleep: scale,
  trainingFeel: scale,
  adherenceNote: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(500).optional(),
});
export type SubmitCheckinInput = z.infer<typeof submitSchema>;

export async function submitCheckin(raw: SubmitCheckinInput): Promise<Result> {
  const parsed = submitSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const d = parsed.data;
  const { userId, profile, entitlement } = await requireUser();

  if (!can(entitlement, 'weekly_checkin')) return { error: 'FORBIDDEN_TIER' };

  const db = forUser(userId);
  const todayISO = localTodayISO(profile.timezone);
  const weekStart = weekStartISO(todayISO, profile.weekStart);
  const stats = await computeWeekStats(profile, weekStart);
  const summary = buildCheckinSummary(stats, profile.locale);

  const data = {
    avgWeightKg: stats.avgWeightKg,
    weightChangeKg: stats.weightChangeKg,
    kcalAdherencePct: stats.kcalAdherencePct,
    proteinAdherencePct: stats.proteinAdherencePct,
    workoutsCompleted: stats.workoutsCompleted,
    workoutsPlanned: stats.workoutsPlanned,
    hunger: d.hunger,
    energy: d.energy,
    sleep: d.sleep,
    trainingFeel: d.trainingFeel,
    adherenceNote: d.adherenceNote || null,
    notes: d.notes || null,
    aiSummary: summary,
    status: 'SUBMITTED' as const,
  };

  const weekStartDate = isoToUtcDate(weekStart);
  const updated = await db.weeklyCheckin.updateMany({ where: { weekStart: weekStartDate }, data });
  if (updated.count === 0) {
    await db.weeklyCheckin.create({ data: { userId, weekStart: weekStartDate, ...data } });
  }

  revalidatePath('/checkin');
  revalidatePath('/calendar');
  return { ok: true };
}
