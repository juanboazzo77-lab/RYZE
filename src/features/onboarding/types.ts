import type {
  ActivityLevel,
  ExperienceLevel,
  Locale,
  PrimaryGoal,
  Sex,
  TrainingPlace,
  UnitSystem,
} from '@prisma/client';

export interface OnboardingData {
  name: string;
  sex: Sex | null;
  birthdate: string; // yyyy-mm-dd
  heightCm: number;
  currentWeightKg: number;
  primaryGoal: PrimaryGoal | null;
  targetWeightKg: number | null;
  weeklyRateKg: number | null;
  experienceLevel: ExperienceLevel | null;
  daysAvailable: number;
  sessionMinutes: number;
  trainingPlace: TrainingPlace | null;
  equipment: string[];
  activityLevel: ActivityLevel | null;
  /** Grupos musculares a priorizar (slugs, ver coach-profile/schema.ts). */
  musclePriorities: string[];
  /** Ejercicios que prefiere evitar (tags libres). */
  dislikedExercises: string[];
  /** Estilo de split preferido (slug, ver coach-profile/schema.ts ROUTINE_STYLE). */
  routineStyle: string | null;
  mealsPerDay: number;
  dietaryPrefs: string[];
  excludedFoods: string[];
  allergies: string[];
  injuries: string;
  trainingExperienceNote: string;
  unitSystem: UnitSystem;
  locale: Locale;
  /** Fotos para la recomendación de objetivo cuando el objetivo es "indeciso". */
  photos: string[];
  /** ¿Practica algún deporte además del gimnasio? */
  doesSport: boolean;
  sport: {
    name: string;
    level: string;
    sessionsPerWeek: number;
    sessionDays: number[];
    goal: string;
  };
  /** Próxima competencia (opcional). */
  competition: { name: string; date: string; priority: string };
}

/** Objetivos que necesitan un peso meta. */
export const GOALS_WITH_TARGET_WEIGHT: PrimaryGoal[] = ['LOSE_FAT', 'GAIN_MUSCLE', 'RECOMP'];
