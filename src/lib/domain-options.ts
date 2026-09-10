/**
 * Orden de presentación de las opciones de cada enum / lista. Las etiquetas
 * viven en los diccionarios i18n (`t.enums.*`).
 */
import type {
  ActivityLevel,
  ExperienceLevel,
  PrimaryGoal,
  Sex,
  TrainingPlace,
} from '@prisma/client';

export const SEX_OPTIONS: Sex[] = ['MALE', 'FEMALE', 'OTHER'];

export const EXPERIENCE_OPTIONS: ExperienceLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

export const GOAL_OPTIONS: PrimaryGoal[] = [
  'LOSE_FAT',
  'GAIN_MUSCLE',
  'RECOMP',
  'MAINTAIN',
  'STRENGTH',
  'PERFORMANCE',
  'UNDECIDED',
];

export const TRAINING_PLACE_OPTIONS: TrainingPlace[] = ['GYM', 'HOME', 'BOTH'];

export const ACTIVITY_OPTIONS: ActivityLevel[] = [
  'SEDENTARY',
  'LIGHT',
  'MODERATE',
  'ACTIVE',
  'VERY_ACTIVE',
];

/** Preferencias alimenticias (se guardan como strings en `profile.dietary_prefs`). */
export const DIETARY_PREF_OPTIONS = [
  'OMNIVORE',
  'VEGETARIAN',
  'VEGAN',
  'PESCATARIAN',
  'LACTOSE_FREE',
  'GLUTEN_FREE',
  'LOW_CARB',
  'HIGH_PROTEIN',
  'MEDITERRANEAN',
] as const;
export type DietaryPref = (typeof DIETARY_PREF_OPTIONS)[number];

/** Equipamiento (se guarda como strings en `profile.equipment`). */
export const EQUIPMENT_OPTIONS = [
  'FULL_GYM',
  'MACHINES',
  'BARBELL',
  'DUMBBELLS',
  'KETTLEBELL',
  'BANDS',
  'PULLUP_BAR',
  'BENCH',
  'CARDIO_MACHINE',
  'BODYWEIGHT',
] as const;
export type Equipment = (typeof EQUIPMENT_OPTIONS)[number];

/** Equipamiento preseleccionado según dónde entrena. */
export function defaultEquipmentFor(place: TrainingPlace): Equipment[] {
  if (place === 'GYM') return ['FULL_GYM'];
  if (place === 'HOME') return ['DUMBBELLS', 'BANDS', 'BODYWEIGHT'];
  return ['FULL_GYM', 'DUMBBELLS', 'BODYWEIGHT'];
}

/** Deportes frecuentes para el autocompletado (texto libre, no es un enum). */
export const COMMON_SPORTS = [
  'Fútbol',
  'Running',
  'Ciclismo',
  'Natación',
  'Básquet',
  'Tenis',
  'Pádel',
  'Vóley',
  'Rugby',
  'Hockey',
  'Handball',
  'CrossFit',
  'Escalada',
  'Boxeo',
  'MMA',
  'Jiu-jitsu',
  'Judo',
  'Karate',
  'Atletismo',
  'Triatlón',
  'Remo',
  'Golf',
  'Surf',
  'Ski / Snowboard',
  'Patín',
  'Powerlifting',
  'Halterofilia',
  'Calistenia',
  'Yoga',
  'Pilates',
  'Danza',
  'Trekking / Montañismo',
] as const;

export const SPORT_LEVELS = ['recreativo', 'amateur', 'competitivo', 'profesional'] as const;
export type SportLevel = (typeof SPORT_LEVELS)[number];

export const COMPETITION_PRIORITIES = ['A', 'B', 'C'] as const;
export type CompetitionPriority = (typeof COMPETITION_PRIORITIES)[number];
