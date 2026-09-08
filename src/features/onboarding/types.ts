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
}

/** Objetivos que necesitan un peso meta. */
export const GOALS_WITH_TARGET_WEIGHT: PrimaryGoal[] = ['LOSE_FAT', 'GAIN_MUSCLE', 'RECOMP'];
