import { z } from 'zod';

export const onboardingSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sex: z.enum(['MALE', 'FEMALE', 'OTHER']),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heightCm: z.number().min(120).max(230),
  currentWeightKg: z.number().min(30).max(400),
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
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  daysAvailable: z.number().int().min(1).max(7),
  sessionMinutes: z.number().int().min(15).max(180),
  trainingPlace: z.enum(['GYM', 'HOME', 'BOTH']),
  equipment: z.array(z.string().max(40)).max(20),
  activityLevel: z.enum(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE']),
  mealsPerDay: z.number().int().min(1).max(10),
  dietaryPrefs: z.array(z.string().max(40)).max(20),
  excludedFoods: z.array(z.string().max(60)).max(50),
  allergies: z.array(z.string().max(60)).max(50),
  injuries: z.string().max(1000),
  trainingExperienceNote: z.string().max(1000),
  unitSystem: z.enum(['METRIC', 'IMPERIAL']),
  locale: z.enum(['ES', 'EN']),
  /**
   * Fotos para la recomendación de objetivo (sólo si `primaryGoal` es
   * UNDECIDED). Data URLs ya reducidas en el cliente. NO se guardan: se mandan
   * al modelo para la recomendación y se descartan.
   */
  photos: z
    .array(z.string().regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/).max(4_000_000))
    .max(4)
    .optional(),
  /** Deporte que practica además del gimnasio (opcional). */
  sport: z
    .object({
      name: z.string().trim().min(1).max(60),
      level: z.string().trim().max(30).optional(),
      sessionsPerWeek: z.number().int().min(0).max(21),
      sessionDays: z.array(z.number().int().min(1).max(7)).max(7),
      goal: z.string().trim().max(200).optional(),
    })
    .optional(),
  /** Próxima competencia (opcional; requiere `sport`). */
  competition: z
    .object({
      name: z.string().trim().min(1).max(100),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      priority: z.enum(['A', 'B', 'C']),
    })
    .optional(),
});

export type OnboardingPayload = z.infer<typeof onboardingSchema>;
