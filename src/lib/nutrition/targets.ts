/**
 * Estimación inicial de objetivos nutricionales (Harris-Benedict revisada +
 * factor de actividad + ajuste por objetivo). Son ESTIMACIONES: la app las
 * ajusta después según evolución y adherencia (check-in semanal).
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
  /**
   * Sesiones de deporte por semana (además del gimnasio). Suben el gasto:
   * ~3,5 % de TDEE por sesión, tope +25 %.
   */
  sportSessionsPerWeek?: number | null;
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

/** BMR Harris-Benedict (revisada, Roza & Shizgal 1984). `OTHER` promedia las fórmulas masculina y femenina. */
export function harrisBenedict(input: Pick<TargetInput, 'sex' | 'ageYears' | 'heightCm' | 'weightKg'>): number {
  const male = 88.362 + 13.397 * input.weightKg + 4.799 * input.heightCm - 5.677 * input.ageYears;
  const female = 447.593 + 9.247 * input.weightKg + 3.098 * input.heightCm - 4.33 * input.ageYears;
  if (input.sex === 'MALE') return male;
  if (input.sex === 'FEMALE') return female;
  return (male + female) / 2;
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
  const bmr = Math.round(harrisBenedict(input));
  const base = Math.round(bmr * ACTIVITY_FACTOR[input.activityLevel]);
  const sportPct = clamp((input.sportSessionsPerWeek ?? 0) * 3.5, 0, 25) / 100;
  const tdee = Math.round(base * (1 + sportPct));

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
