import 'server-only';
import type { Profile } from '@prisma/client';
import { forUser } from '@/server/user-db';
import { physiqueAnalysisSchema, type PhysiqueAnalysis } from '@/features/coach-profile/physique-schema';

export interface PhysiqueEntry {
  id: string;
  createdAt: string;
  photoCount: number;
  note: string | null;
  report: PhysiqueAnalysis;
}

/** Máximo de análisis por día, para cuidar el costo de la IA. */
export const PHYSIQUE_DAILY_LIMIT = 3;

export async function listPhysiqueAnalyses(profile: Profile, limit = 12): Promise<PhysiqueEntry[]> {
  const rows = await forUser(profile.id).physiqueAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    photoCount: r.photoCount,
    note: r.note,
    // Tolerante: un informe viejo o raro nunca rompe la pantalla.
    report: physiqueAnalysisSchema.parse(r.report ?? {}),
  }));
}
