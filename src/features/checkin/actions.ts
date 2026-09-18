'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Profile } from '@prisma/client';
import { requireUser } from '@/server/context';
import { forUser, type UserDb } from '@/server/user-db';
import { prisma } from '@/server/db';
import { can } from '@/server/entitlements';
import { isoToUtcDate, localTodayISO, weekStartISO } from '@/lib/date';
import { buildCheckinSummary } from '@/lib/checkin/summary';
import { AiError } from '@/server/ai/errors';
import { aiConfigured } from '@/server/ai/config';
import {
  reviewWeeklyCheckin,
  type CheckinHistoryEntry,
} from '@/server/ai/gateway';
import { computeTrainingWeek, computeWeekStats } from './queries';
import { type CheckinProposal, type TrainingProposal, type TrainingReview } from './schema';

export interface Result {
  ok?: boolean;
  error?: string;
}

const scale = z.number().int().min(1).max(5).nullable();

/**
 * Foto de físico: data URL de imagen, ya reducida en el cliente. Tope ~4 MB por
 * las dudas. NUNCA se guarda: sólo se manda a la IA para el análisis de esta
 * revisión y se descarta.
 */
const photo = z
  .string()
  .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)
  .max(4_000_000);

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
  photos: z.array(photo).max(4).optional(),
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

/**
 * Aplica el ajuste de objetivos nutricionales que decidió el Coach. Se llama
 * automáticamente al terminar la revisión del check-in — el usuario no tiene
 * que confirmar nada, el cambio ya queda activo en toda la app (nutrición,
 * dashboard, etc.).
 */
async function applyNutritionProposal(
  db: UserDb,
  userId: string,
  proposal: CheckinProposal,
): Promise<boolean> {
  if (proposal.kind !== 'nutrition_targets' || !proposal.to) return false;
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
  return true;
}

/**
 * Aplica la progresión de entrenamiento que decidió el Coach (sube o baja
 * objetivos de reps/series en el plan activo, ver detalle en el comentario
 * histórico más abajo). Se llama automáticamente al terminar la revisión —
 * no requiere confirmación del usuario. Best-effort: no falla si algún
 * ejercicio no matchea con el plan.
 */
async function applyTrainingProposal(proposal: TrainingReview): Promise<number> {
  const plan = await prisma.workoutPlan.findFirst({
    where: { isActive: true },
    select: {
      days: {
        select: {
          exercises: {
            select: {
              id: true,
              targetSets: true,
              targetRepsMin: true,
              targetRepsMax: true,
              exercise: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const byName = new Map<string, { id: string; sets: number; rMin: number | null; rMax: number | null }>();
  for (const day of plan?.days ?? []) {
    for (const pe of day.exercises) {
      byName.set(pe.exercise.name.trim().toLowerCase(), {
        id: pe.id,
        sets: pe.targetSets,
        rMin: pe.targetRepsMin,
        rMax: pe.targetRepsMax,
      });
    }
  }

  let changed = 0;
  const adjustedIds = new Set<string>();
  for (const adj of proposal.adjustments) {
    const pe = byName.get(adj.exercise.trim().toLowerCase());
    if (!pe) continue;
    const data =
      adj.action === 'add_set'
        ? { targetSets: Math.min(8, pe.sets + 1) }
        : adj.action === 'reduce'
          ? { targetSets: Math.max(1, pe.sets - 1) }
          : adj.action === 'add_reps'
            ? {
                targetRepsMax: Math.min(40, (pe.rMax ?? pe.rMin ?? 8) + 1),
                ...(pe.rMin != null ? { targetRepsMin: Math.min(38, pe.rMin + 1) } : {}),
              }
            : null;
    if (!data) continue;
    await prisma.planExercise.update({ where: { id: pe.id }, data });
    adjustedIds.add(pe.id);
    changed++;
  }

  // Semana de descarga: bajamos un escalón el volumen del resto del plan
  // (los ejercicios ya ajustados arriba no se tocan de nuevo).
  if (proposal.call === 'deload') {
    for (const pe of byName.values()) {
      if (adjustedIds.has(pe.id) || pe.sets <= 2) continue;
      await prisma.planExercise.update({
        where: { id: pe.id },
        data: { targetSets: Math.max(2, pe.sets - 1) },
      });
      changed++;
    }
  }

  return changed;
}

export async function submitCheckin(raw: SubmitCheckinInput): Promise<Result> {
  const parsed = submitSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const d = parsed.data;
  // Privacidad: las fotos viven SÓLO en esta variable local. No entran en
  // `baseData` ni en ninguna escritura a la DB; sólo se pasan a la IA.
  const photos = d.photos ?? [];
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

      const trainingWeek = await computeTrainingWeek(profile, weekStart);

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
        photos,
        trainingBlock: trainingWeek.hasData ? trainingWeek.block : null,
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

        // Sólo tocar el análisis de fotos si se mandaron fotos en este envío;
        // re-enviar el check-in sin fotos no borra un análisis previo.
        const photoNote =
          photos.length > 0 ? { aiPhotoNote: review.physiqueNote?.trim() || null } : {};

        // Aplicar ya, sin que el usuario tenga que confirmar nada: si el
        // Coach decide un ajuste, se refleja directo en toda la app
        // (objetivos nutricionales, plan de entrenamiento).
        const nutritionApplied = await applyNutritionProposal(db, userId, proposal);

        let trainingProposal: TrainingProposal | null = null;
        let trainingChanged = 0;
        if (trainingWeek.hasData && review.training) {
          trainingChanged = await applyTrainingProposal(review.training);
          trainingProposal = { ...review.training, applied: true };
        }

        await db.weeklyCheckin.updateMany({
          where: { weekStart: weekStartDate },
          data: {
            aiSummary: review.summary,
            ...photoNote,
            aiProposal: proposal as unknown as object,
            ...(trainingProposal
              ? { aiTrainingProposal: trainingProposal as unknown as object }
              : {}),
            status: nutritionApplied || trainingChanged > 0 ? 'APPLIED' : 'REVIEWED',
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
  revalidatePath('/nutrition');
  revalidatePath('/dashboard');
  revalidatePath('/settings/goals');
  revalidatePath('/training');
  return { ok: true };
}

