import { z } from 'zod';
import { COMPETITION_PRIORITIES, SPORT_LEVELS } from '@/lib/domain-options';

export const sportInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  level: z.enum(SPORT_LEVELS).nullable().optional(),
  sessionsPerWeek: z.number().int().min(0).max(21),
  sessionDays: z.array(z.number().int().min(1).max(7)).max(7).default([]),
  goal: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
});
export type SportInput = z.infer<typeof sportInputSchema>;

export const addSportSchema = sportInputSchema;
export const updateSportSchema = sportInputSchema.extend({ id: z.string().uuid() });

export const competitionInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  priority: z.enum(COMPETITION_PRIORITIES).default('B'),
  sportProfileId: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(300).optional(),
});
export type CompetitionInput = z.infer<typeof competitionInputSchema>;

export const idSchema = z.object({ id: z.string().uuid() });
