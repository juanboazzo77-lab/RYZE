import { z } from 'zod';
import { MUSCLE_PRIORITIES, ROUTINE_STYLE } from '@/features/coach-profile/schema';

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sex: z.enum(['MALE', 'FEMALE', 'OTHER']),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heightCm: z.number().min(120).max(230),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  daysAvailable: z.number().int().min(1).max(7),
  sessionMinutes: z.number().int().min(15).max(180),
  trainingPlace: z.enum(['GYM', 'HOME', 'BOTH']),
  equipment: z.array(z.string().max(40)).max(20),
  activityLevel: z.enum(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE']),
  musclePriorities: z.array(z.enum(MUSCLE_PRIORITIES)).max(8),
  dislikedExercises: z.array(z.string().trim().min(1).max(40)).max(20),
  routineStyle: z.enum(ROUTINE_STYLE).nullable(),
  mealsPerDay: z.number().int().min(1).max(10),
  dietaryPrefs: z.array(z.string().max(40)).max(20),
  excludedFoods: z.array(z.string().max(60)).max(50),
  allergies: z.array(z.string().max(60)).max(50),
  injuries: z.string().max(1000),
  trainingExperienceNote: z.string().max(1000),
});
export type ProfileUpdatePayload = z.infer<typeof profileUpdateSchema>;

export const goalUpdateSchema = z.object({
  primaryGoal: z.enum([
    'LOSE_FAT',
    'GAIN_MUSCLE',
    'RECOMP',
    'MAINTAIN',
    'STRENGTH',
    'PERFORMANCE',
    'UNDECIDED',
  ]),
  targetWeightKg: z.number().min(30).max(400).nullable(),
  weeklyRateKg: z.number().min(0).max(2).nullable(),
  kcal: z.number().int().min(800).max(8000),
  proteinG: z.number().int().min(20).max(500),
  carbsG: z.number().int().min(0).max(1200),
  fatG: z.number().int().min(10).max(400),
  targetSource: z.enum(['MANUAL', 'CALCULATED']),
});
export type GoalUpdatePayload = z.infer<typeof goalUpdateSchema>;

export const appearanceSchema = z.object({
  locale: z.enum(['ES', 'EN', 'PT', 'FR', 'DE', 'IT']).optional(),
  unitSystem: z.enum(['METRIC', 'IMPERIAL']).optional(),
});
export type AppearancePayload = z.infer<typeof appearanceSchema>;
