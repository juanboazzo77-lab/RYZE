'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { prisma } from '@/server/db';
import { can } from '@/server/entitlements';
import { aiConfigured } from '@/server/ai/config';
import {
  analyzePhysiqueSchema,
  type PhysiqueAnalysis,
} from '@/features/coach-profile/physique-schema';
import { PHYSIQUE_DAILY_LIMIT, type PhysiqueEntry } from './queries';

export interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

const analyzeSchema = analyzePhysiqueSchema.extend({
  note: z.string().trim().max(400).optional(),
});

/** Resumen corto del análisis anterior para que la IA compare la evolución. */
function previousSummary(report: PhysiqueAnalysis, createdAt: Date): string {
  return [
    `Fecha: ${createdAt.toISOString().slice(0, 10)}`,
    report.bodyFatEstimate ? `Grasa estimada: ${report.bodyFatEstimate}` : null,
    report.summary ? `Lectura: ${report.summary}` : null,
    report.weakPoints ? `Puntos a mejorar: ${report.weakPoints}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function analyzePhysiqueReport(raw: {
  photos: string[];
  note?: string;
}): Promise<Result<PhysiqueEntry>> {
  const parsed = analyzeSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };

  const { userId, profile, entitlement } = await requireUser();
  if (!can(entitlement, 'physique_analysis')) return { error: 'FORBIDDEN' };
  if (!aiConfigured()) return { error: 'NOT_CONFIGURED' };

  const db = forUser(userId);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [todayCount, last] = await Promise.all([
    db.physiqueAnalysis.count({ where: { createdAt: { gte: since } } }),
    db.physiqueAnalysis.findFirst({ orderBy: { createdAt: 'desc' } }),
  ]);
  if (todayCount >= PHYSIQUE_DAILY_LIMIT) return { error: 'LIMIT' };

  let analysis: PhysiqueAnalysis | 'blocked' | null;
  try {
    const { analyzePhysique } = await import('@/server/ai/gateway');
    const { physiqueAnalysisSchema } = await import('@/features/coach-profile/physique-schema');
    analysis = await analyzePhysique({
      profile,
      entitlement,
      photos: parsed.data.photos,
      note: parsed.data.note,
      previous: last
        ? previousSummary(physiqueAnalysisSchema.parse(last.report ?? {}), last.createdAt)
        : null,
    });
  } catch (e) {
    console.error('[physique] falló', e instanceof Error ? e.message : e);
    return { error: 'PROVIDER_ERROR' };
  }
  if (analysis === 'blocked') return { error: 'BLOCKED' };
  if (!analysis) return { error: 'INVALID_OUTPUT' };

  const row = await db.physiqueAnalysis.create({
    data: {
      userId,
      report: analysis as object,
      photoCount: parsed.data.photos.length,
      note: parsed.data.note?.trim() || null,
    },
  });

  revalidatePath('/progress/physique');
  return {
    ok: true,
    data: {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      photoCount: row.photoCount,
      note: row.note,
      report: analysis,
    },
  };
}

export async function deletePhysiqueAnalysis(raw: { id: string }): Promise<Result> {
  const id = z.string().uuid().safeParse(raw.id);
  if (!id.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  await forUser(userId).physiqueAnalysis.deleteMany({ where: { id: id.data } });
  revalidatePath('/progress/physique');
  return { ok: true };
}

/** Deja el resultado en el perfil para el coach (campo "análisis de físico previo"). */
export async function applyPhysiqueToCoachProfile(raw: { id: string }): Promise<Result> {
  const id = z.string().uuid().safeParse(raw.id);
  if (!id.success) return { error: 'INVALID' };
  const { userId, entitlement } = await requireUser();
  if (!can(entitlement, 'coach_profile')) return { error: 'FORBIDDEN' };

  const db = forUser(userId);
  const row = await db.physiqueAnalysis.findFirst({ where: { id: id.data } });
  if (!row) return { error: 'NOT_FOUND' };

  const { physiqueAnalysisSchema } = await import('@/features/coach-profile/physique-schema');
  const r = physiqueAnalysisSchema.parse(row.report ?? {});
  const text = [
    r.bodyFatEstimate ? `Grasa estimada: ${r.bodyFatEstimate}.` : '',
    r.weakPoints || r.summary,
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 700);
  if (!text) return { error: 'EMPTY' };

  // Mezcla sólo `goal.physiqueNote` y deja el resto del perfil como está.
  await prisma.$executeRaw`
    INSERT INTO "coach_profile"
      ("id", "user_id", "health", "food", "training", "goal", "lifestyle", "updated_at")
    VALUES (
      gen_random_uuid(), ${userId}::uuid,
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
      jsonb_build_object('physiqueNote', ${text}::text), '{}'::jsonb, now()
    )
    ON CONFLICT ("user_id") DO UPDATE SET
      "goal" = COALESCE("coach_profile"."goal", '{}'::jsonb)
               || jsonb_build_object('physiqueNote', ${text}::text),
      "updated_at" = now()
  `;
  return { ok: true };
}
