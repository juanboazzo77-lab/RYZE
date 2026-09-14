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

interface Lang {
  workouts: (done: number, planned: number) => string;
  weightSame: string;
  weightChange: (down: boolean, abs: number) => string;
  kcal: (pct: number) => string;
  protein: (pct: number) => string;
}

const LANGS: Record<Locale, Lang> = {
  ES: {
    workouts: (d, p) => `Completaste ${d}/${p} entrenamientos esta semana.`,
    weightSame: 'Tu peso se mantuvo estable.',
    weightChange: (down, abs) => `Tu peso ${down ? 'bajó' : 'subió'} ${abs} kg.`,
    kcal: (pct) => `Cumpliste tu objetivo de calorías en cerca del ${pct}% de los días registrados.`,
    protein: (pct) => `Llegaste a tu objetivo de proteína en cerca del ${pct}% de los días registrados.`,
  },
  EN: {
    workouts: (d, p) => `You completed ${d}/${p} workouts this week.`,
    weightSame: 'Your weight stayed about the same.',
    weightChange: (down, abs) => `Your weight ${down ? 'went down' : 'went up'} ${abs} kg.`,
    kcal: (pct) => `You hit your calorie target on about ${pct}% of logged days.`,
    protein: (pct) => `Protein target met on about ${pct}% of logged days.`,
  },
  PT: {
    workouts: (d, p) => `Você completou ${d}/${p} treinos esta semana.`,
    weightSame: 'Seu peso se manteve estável.',
    weightChange: (down, abs) => `Seu peso ${down ? 'caiu' : 'subiu'} ${abs} kg.`,
    kcal: (pct) => `Você bateu sua meta de calorias em cerca de ${pct}% dos dias registrados.`,
    protein: (pct) => `Meta de proteína atingida em cerca de ${pct}% dos dias registrados.`,
  },
  FR: {
    workouts: (d, p) => `Vous avez terminé ${d}/${p} entraînements cette semaine.`,
    weightSame: 'Votre poids est resté stable.',
    weightChange: (down, abs) => `Votre poids a ${down ? 'baissé' : 'augmenté'} de ${abs} kg.`,
    kcal: (pct) => `Vous avez atteint votre objectif calorique environ ${pct}% des jours enregistrés.`,
    protein: (pct) => `Objectif de protéines atteint environ ${pct}% des jours enregistrés.`,
  },
  DE: {
    workouts: (d, p) => `Du hast diese Woche ${d}/${p} Trainingseinheiten abgeschlossen.`,
    weightSame: 'Dein Gewicht ist etwa gleich geblieben.',
    weightChange: (down, abs) => `Dein Gewicht ist um ${abs} kg ${down ? 'gesunken' : 'gestiegen'}.`,
    kcal: (pct) => `Du hast dein Kalorienziel an etwa ${pct}% der erfassten Tage erreicht.`,
    protein: (pct) => `Proteinziel an etwa ${pct}% der erfassten Tage erreicht.`,
  },
  IT: {
    workouts: (d, p) => `Hai completato ${d}/${p} allenamenti questa settimana.`,
    weightSame: 'Il tuo peso è rimasto stabile.',
    weightChange: (down, abs) => `Il tuo peso è ${down ? 'diminuito' : 'aumentato'} di ${abs} kg.`,
    kcal: (pct) => `Hai raggiunto il tuo obiettivo calorico in circa il ${pct}% dei giorni registrati.`,
    protein: (pct) => `Obiettivo proteine raggiunto in circa il ${pct}% dei giorni registrati.`,
  },
};

export function buildCheckinSummary(s: CheckinStats, locale: Locale): string {
  const lang = LANGS[locale];
  const lines: string[] = [lang.workouts(s.workoutsCompleted, s.workoutsPlanned)];

  if (s.weightChangeKg !== null) {
    const abs = round1(Math.abs(s.weightChangeKg));
    lines.push(abs < 0.1 ? lang.weightSame : lang.weightChange(s.weightChangeKg < 0, abs));
  }
  if (s.kcalAdherencePct !== null) lines.push(lang.kcal(s.kcalAdherencePct));
  if (s.proteinAdherencePct !== null) lines.push(lang.protein(s.proteinAdherencePct));

  return lines.join(' ');
}
