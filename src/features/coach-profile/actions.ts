'use server';

import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { saveCoachProfileSchema } from './schema';

export interface Result {
  ok?: boolean;
  error?: string;
}

const j = (v: unknown) => JSON.stringify(v ?? {});

export async function saveCoachProfile(raw: unknown): Promise<Result> {
  const parsed = saveCoachProfileSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const d = parsed.data;

  const { userId } = await requireUser();
  const db = forUser(userId);

  // Un único statement (INSERT ... ON CONFLICT): una sola toma de conexión, que
  // importa con connection_limit=1. Las páginas que muestran esto (/settings/about,
  // /dashboard) son dinámicas y se re-renderizan solas en la próxima navegación,
  // así que no hace falta revalidatePath (encadenaría más queries al guardar).
  try {
    await db.$executeRaw`
      INSERT INTO "coach_profile"
        ("id", "user_id", "health", "food", "training", "goal", "lifestyle", "updated_at")
      VALUES (
        gen_random_uuid(), ${userId}::uuid,
        ${j(d.health)}::jsonb, ${j(d.food)}::jsonb, ${j(d.training)}::jsonb,
        ${j(d.goal)}::jsonb, ${j(d.lifestyle)}::jsonb, now()
      )
      ON CONFLICT ("user_id") DO UPDATE SET
        "health" = EXCLUDED."health",
        "food" = EXCLUDED."food",
        "training" = EXCLUDED."training",
        "goal" = EXCLUDED."goal",
        "lifestyle" = EXCLUDED."lifestyle",
        "updated_at" = now()
    `;
  } catch (err) {
    console.error('[saveCoachProfile]', err);
    return { error: 'SAVE_FAILED' };
  }

  return { ok: true };
}
