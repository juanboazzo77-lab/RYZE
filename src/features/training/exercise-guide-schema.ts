import { z } from 'zod';

const MUSCLE = z.enum([
  'CHEST',
  'BACK',
  'SHOULDERS',
  'BICEPS',
  'TRICEPS',
  'FOREARMS',
  'QUADS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'ABS',
  'TRAPS',
  'FULL_BODY',
  'OTHER',
]);

/** Guía de un ejercicio generada por IA y cacheada en `exercise`. Plana para Gemini. */
export const exerciseGuideSchema = z.object({
  /** 3-5 cues de técnica cortos y accionables. */
  cues: z.array(z.string().min(3).max(220)).min(2).max(6),
  /** Músculos secundarios que participan. */
  secondaryMuscles: z.array(MUSCLE).max(4),
});
export type ExerciseGuideAi = z.infer<typeof exerciseGuideSchema>;
