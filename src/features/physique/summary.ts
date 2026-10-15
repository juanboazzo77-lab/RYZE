import type { PhysiqueAnalysis } from '@/features/coach-profile/physique-schema';

/** Resumen corto del análisis anterior para que la IA compare la evolución. */
export function previousSummary(report: PhysiqueAnalysis, createdAt: Date): string {
  return [
    `Fecha: ${createdAt.toISOString().slice(0, 10)}`,
    report.bodyFatEstimate ? `Grasa estimada: ${report.bodyFatEstimate}` : null,
    report.summary ? `Lectura: ${report.summary}` : null,
    report.weakPoints ? `Puntos a mejorar: ${report.weakPoints}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}
