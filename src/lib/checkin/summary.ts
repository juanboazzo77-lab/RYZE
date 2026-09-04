/**
 * Texto de resumen del check-in semanal, armado a partir de los datos
 * objetivos de la semana. Determinístico (sin IA) — Fase 8/9 puede reemplazar
 * este texto por uno generado por el modelo usando los mismos datos.
 */
import type { Locale } from '@prisma/client';

export interface CheckinStats {
  workoutsCompleted: number;
  workoutsPlanned: number;
  weightChangeKg: number | null;
  kcalAdherencePct: number | null;
  proteinAdherencePct: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildCheckinSummary(s: CheckinStats, locale: Locale): string {
  const lines: string[] = [];

  if (locale === 'EN') {
    lines.push(`You completed ${s.workoutsCompleted}/${s.workoutsPlanned} workouts this week.`);
    if (s.weightChangeKg !== null) {
      const abs = round1(Math.abs(s.weightChangeKg));
      lines.push(
        abs < 0.1
          ? 'Your weight stayed about the same.'
          : `Your weight ${s.weightChangeKg < 0 ? 'went down' : 'went up'} ${abs} kg.`,
      );
    }
    if (s.kcalAdherencePct !== null) {
      lines.push(`You hit your calorie target on about ${s.kcalAdherencePct}% of logged days.`);
    }
    if (s.proteinAdherencePct !== null) {
      lines.push(`Protein target met on about ${s.proteinAdherencePct}% of logged days.`);
    }
    return lines.join(' ');
  }

  lines.push(`Completaste ${s.workoutsCompleted}/${s.workoutsPlanned} entrenamientos esta semana.`);
  if (s.weightChangeKg !== null) {
    const abs = round1(Math.abs(s.weightChangeKg));
    lines.push(
      abs < 0.1
        ? 'Tu peso se mantuvo estable.'
        : `Tu peso ${s.weightChangeKg < 0 ? 'bajó' : 'subió'} ${abs} kg.`,
    );
  }
  if (s.kcalAdherencePct !== null) {
    lines.push(`Cumpliste tu objetivo de calorías en cerca del ${s.kcalAdherencePct}% de los días registrados.`);
  }
  if (s.proteinAdherencePct !== null) {
    lines.push(`Llegaste a tu objetivo de proteína en cerca del ${s.proteinAdherencePct}% de los días registrados.`);
  }
  return lines.join(' ');
}
