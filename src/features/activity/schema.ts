import { z } from 'zod';

export const logActivitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  steps: z.number().int().min(0).max(120000),
  activeMinutes: z.number().int().min(0).max(1440).nullable().optional(),
});
export type LogActivityInput = z.infer<typeof logActivitySchema>;

export const deleteActivitySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
