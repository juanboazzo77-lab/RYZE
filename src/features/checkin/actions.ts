'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Profile } from '@prisma/client';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { can } from '@/server/entitlements';
import { isoToUtcDate, localTodayISO, weekStartISO } from '@/lib/date';
import { buildCheckinSummary } from '@/lib/checkin/summary';
import { AiError } from '@/server/ai/errors';
import { aiConfigured } from '@/server/ai/config';
import {
  reviewWeeklyCheckin,
  type CheckinHistoryEntry,
} from '@/server/ai/gateway';
import { computeWeekStats } from './queries';
import { weekActionSchema, type CheckinProposal, type WeekActionInput } from './schema';

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
  dietAdherence: scale,
  stress: scale,
  outsideActivity: scale,
  adherenceNote: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(500).optional(),
});
export type SubmitCheckinInput = z.infer<typeof submitSchema>;

type Macros = { kcal: number; proteinG: number; carbsG: number; fatG: number };

/** Acota la propuesta de la IA: cambio de kcal ≤ ±20% y pisos de seguridad. */
function clampTarget(current: Macros | null, proposed: Macros, profile: Profile): Macros {
  const floor = profile.sex === 'FEMALE' ? 1200 : 1500;
  let kcal = Math.round(proposed.kcal);
  if (current) {
    const lo = Math.round(current.kcal * 0.8);
    const hi = Math.round(current.kcal * 1.2);
    kcal = Math.min(hi, Math.max(lo, kcal));
  }
  kcal = Math.max(floor, kcal);

  const proteinG = Math.min(400, Math.max(40, Math.round(proposed.proteinG)));
  const fatG = Math.min(300, Math.max(15, Math.round(proposed.fatG)));
  // Carbos: lo que sobra tras proteína y grasa (coherencia con kcal).
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));
  return { kcal, proteinG, carbsG, fatG };
}

function describeDecision(proposal: unknown): string {
  const p = proposal as CheckinProposal | null;
  if (!p || p.kind === 'none') return 'mantener';
  if (p.to) return `ajustar a ${p.to.kcal} kcal`;
  return 'ajustar';
}

export async function submitCheckin(raw: SubmitCheckinInput): Promise<Result> {
  const parsed = submitSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const d = parsed.data;
  const { userId, profile, entitlement } = await requireUser();

  if (!can(entitlement, 'weekly_checkin')) return { error: 'FORBIDDEN_TIER' };

  const db = forUser(userId);
  const todayISO = localTodayISO(profile.timezone);
  const weekStart = weekStartISO(todayISO, profile.weekStart);
  const weekStartDate = isoToUtcDate(weekStart);
  const stats = await computeWeekStats(profile, weekStart);
  const fallbackSummary = buildCheckinSummary(stats, profile.locale);

  const baseData = {
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
    dietAdherence: d.dietAdherence,
    stress: d.stress,
    outsideActivity: d.outsideActivity,
    adherenceNote: d.adherenceNote || null,
    notes: d.notes || null,
  };

  // 1) Guardar el check-in ya, con el resumen determinístico. Si la IA falla o
  //    tarda, el check-in queda igual.
  const seeded = await db.weeklyCheckin.updateMany({
    where: { weekStart: weekStartDate },
    data: { ...baseData, aiSummary: fallbackSummary, aiProposal: undefined, status: 'SUBMITTED' },
  });
  if (seeded.count === 0) {
    await db.weeklyCheckin.create({
      data: { userId, weekStart: weekStartDate, ...baseData, aiSummary: fallbackSummary, status: 'SUBMITTED' },
    });
  }

  // 2) Revisión con IA (best-effort).
  if (aiConfigured()) {
    try {
      const [currentTarget, past] = await db.$transaction([
        db.nutritionTarget.findFirst({
          where: { active: true },
          select: { kcal: true, proteinG: true, carbsG: true, fatG: true },
        }),
        db.weeklyCheckin.findMany({
          where: { weekStart: { lt: weekStartDate } },
          orderBy: { weekStart: 'desc' },
          take: 6,
          select: {
            weekStart: true,
            weightChangeKg: true,
            kcalAdherencePct: true,
            aiProposal: true,
            status: true,
          },
        }),
      ]);

      const history: CheckinHistoryEntry[] = past.map((h) => ({
        weekStartISO: h.weekStart.toISOString().slice(0, 10),
        weightChangeKg: h.weightChangeKg,
        kcalAdherencePct: h.kcalAdherencePct,
        decision: describeDecision(h.aiProposal),
        applied: h.status === 'APPLIED',
      }));

      const { review } = await reviewWeeklyCheckin({
        profile,
        entitlement,
        week: stats,
        subjective: {
          hunger: d.hunger,
          energy: d.energy,
          sleep: d.sleep,
          trainingFeel: d.trainingFeel,
          dietAdherence: d.dietAdherence,
          stress: d.stress,
          outsideActivity: d.outsideActivity,
          adherenceNote: d.adherenceNote || null,
          notes: d.notes || null,
        },
        currentTarget: currentTarget ?? null,
        history,
      });

      if (review) {
        let proposal: CheckinProposal;
        if (review.adjust) {
          const to = clampTarget(
            currentTarget ?? null,
            { kcal: review.kcal, proteinG: review.proteinG, carbsG: review.carbsG, fatG: review.fatG },
            profile,
          );
          const meaningful =
            !currentTarget || Math.abs(to.kcal - currentTarget.kcal) >= 40;
          proposal = {
            kind: meaningful ? 'nutrition_targets' : 'none',
            rationale: review.rationale,
            from: currentTarget ?? null,
            to: meaningful ? to : null,
          };
        } else {
          proposal = { kind: 'none', rationale: review.rationale, from: currentTarget ?? null, to: null };
        }

        await db.weeklyCheckin.updateMany({
          where: { weekStart: weekStartDate },
          data: {
            aiSummary: review.summary,
            aiProposal: proposal as unknown as object,
            status: 'REVIEWED',
          },
        });
      }
    } catch (e) {
      if (e instanceof AiError) console.error('[checkin] AiError', e.code, '-', e.message);
      else console.error('[checkin] review falló', e instanceof Error ? e.message : e);
      // el check-in ya quedó guardado con el resumen determinístico
    }
  }

  revalidatePath('/checkin');
  revalidatePath('/calendar');
  return { ok: true };
}

/** Aplica el ajuste de objetivos nutricionales propuesto por la IA en el check-in. */
export async function applyCheckinAdjustment(raw: WeekActionInput): Promise<Result> {
  const parsed = weekActionSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, entitlement } = await requireUser();
  if (!can(entitlement, 'weekly_checkin')) return { error: 'FORBIDDEN_TIER' };

  const db = forUser(userId);
  const weekStartDate = isoToUtcDate(parsed.data.weekStart);

  const checkin = await db.weeklyCheckin.findFirst({
    where: { weekStart: weekStartDate },
    select: { aiProposal: true, status: true },
  });
  if (!checkin) return { error: 'NOT_FOUND' };
  if (checkin.status === 'APPLIED') return { ok: true };

  const proposal = checkin.aiProposal as CheckinProposal | null;
  if (!proposal || proposal.kind !== 'nutrition_targets' || !proposal.to) {
    return { error: 'NO_ADJUSTMENT' };
  }
  const to = proposal.to;

  await db.nutritionTarget.updateMany({ where: { active: true }, data: { active: false } });
  await db.nutritionTarget.create({
    data: {
      userId,
      effectiveFrom: new Date(),
      kcal: to.kcal,
      proteinG: to.proteinG,
      carbsG: to.carbsG,
      fatG: to.fatG,
      source: 'AI',
      active: true,
    },
  });
  await db.weeklyCheckin.updateMany({ where: { weekStart: weekStartDate }, data: { status: 'APPLIED' } });

  revalidatePath('/checkin');
  revalidatePath('/nutrition');
  revalidatePath('/dashboard');
  revalidatePath('/settings/goals');
  return { ok: true };
}

/** Descarta el ajuste propuesto (queda el check-in sin cambios de objetivos). */
export async function dismissCheckinAdjustment(raw: WeekActionInput): Promise<Result> {
  const parsed = weekActionSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, entitlement } = await requireUser();
  if (!can(entitlement, 'weekly_checkin')) return { error: 'FORBIDDEN_TIER' };

  const db = forUser(userId);
  const weekStartDate = isoToUtcDate(parsed.data.weekStart);
  const checkin = await db.weeklyCheckin.findFirst({
    where: { weekStart: weekStartDate },
    select: { aiProposal: true },
  });
  const proposal = (checkin?.aiProposal as CheckinProposal | null) ?? null;

  await db.weeklyCheckin.updateMany({
    where: { weekStart: weekStartDate },
    data: {
      status: 'SUBMITTED',
      aiProposal: (proposal
        ? { ...proposal, kind: 'none', to: null }
        : { kind: 'none', rationale: '', from: null, to: null }) as unknown as object,
    },
  });
  revalidatePath('/checkin');
  return { ok: true };
}
