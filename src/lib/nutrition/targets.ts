/**
 * Estimación inicial de objetivos nutricionales (Mifflin-St Jeor + factor de
 * actividad + ajuste por objetivo). Son ESTIMACIONES: la app las ajusta después
 * según evolución y adherencia (check-in semanal).
 *
 * Función pura y testeada. No toca la DB.
 */
import type { ActivityLevel, PrimaryGoal, Sex } from '@prisma/client';

export interface TargetInput {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: PrimaryGoal;
  /** Ritmo de cambio de peso deseado (kg/semana, siempre positivo). Opcional. */
  weeklyRateKg?: number | null;
}

export interface TargetResult {
  bmr: number;
  tdee: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Ajuste aplicado sobre el TDEE, en % (negativo = déficit). */
  adjustmentPct: number;
  estimated: true;
}

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

/** kcal por kg de peso corporal (aprox. termodinámica de grasa). */
const KCAL_PER_KG = 7700;

function round(n: number, step: number): number {
  return Math.round(n / step) * step;
}
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** BMR Mifflin-St Jeor. `OTHER` promedia las fórmulas masculina y femenina. */
export function mifflinStJeor(input: Pick<TargetInput, 'sex' | 'ageYears' | 'heightCm' | 'weightKg'>): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears;
  if (input.sex === 'MALE') return base + 5;
  if (input.sex === 'FEMALE') return base - 161;
  return base - 78; // promedio de +5 y -161
}

/** % de ajuste sobre el TDEE según objetivo (y ritmo si se indica). */
export function goalAdjustmentPct(
  goal: PrimaryGoal,
  tdee: number,
  weeklyRateKg?: number | null,
): number {
  if (goal === 'MAINTAIN') return 0;

  if (weeklyRateKg && weeklyRateKg > 0) {
    const dailyKcal = (weeklyRateKg * KCAL_PER_KG) / 7;
    const pct = (dailyKcal / tdee) * 100;
    if (goal === 'LOSE_FAT') return -clamp(pct, 8, 25);
    if (goal === 'GAIN_MUSCLE') return clamp(pct, 5, 15);
  }

  switch (goal) {
    case 'LOSE_FAT':
      return -18;
    case 'GAIN_MUSCLE':
      return 10;
    case 'RECOMP':
      return -5;
    case 'STRENGTH':
      return 5;
    case 'PERFORMANCE':
      return 3;
    default:
      return 0;
  }
}

export function computeTargets(input: TargetInput): TargetResult {
  const bmr = Math.round(mifflinStJeor(input));
  const tdee = Math.round(bmr * ACTIVITY_FACTOR[input.activityLevel]);

  const adjustmentPct = goalAdjustmentPct(input.goal, tdee, input.weeklyRateKg);
  const kcal = round(tdee * (1 + adjustmentPct / 100), 10);

  // Proteína: 2.0 g/kg (2.2 si hay déficit), tope razonable.
  const proteinPerKg = input.goal === 'LOSE_FAT' ? 2.2 : 2.0;
  const proteinG = round(clamp(input.weightKg * proteinPerKg, 60, 260), 5);

  // Grasa: 0.9 g/kg, piso 0.6.
  const fatG = round(clamp(input.weightKg * 0.9, input.weightKg * 0.6, kcal * 0.4 / 9), 5);

  // Carbohidratos: lo que sobra.
  const carbsKcal = Math.max(0, kcal - proteinG * 4 - fatG * 9);
  const carbsG = round(carbsKcal / 4, 5);

  return {
    bmr,
    tdee,
    kcal,
    proteinG,
    carbsG,
    fatG,
    adjustmentPct: Math.round(adjustmentPct * 10) / 10,
    estimated: true,
  };
}

/** Ritmo semanal sugerido por defecto (kg/semana) según objetivo. */
export function defaultWeeklyRateKg(goal: PrimaryGoal): number | null {
  switch (goal) {
    case 'LOSE_FAT':
      return 0.5;
    case 'GAIN_MUSCLE':
      return 0.25;
    case 'RECOMP':
      return 0.1;
    default:
      return null;
  }
}

export function ageFromBirthdate(birthdate: Date, now = new Date()): number {
  let age = now.getFullYear() - birthdate.getFullYear();
  const m = now.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthdate.getDate())) age--;
  return age;
}
