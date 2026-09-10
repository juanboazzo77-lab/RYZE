'use server';

import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { saveCoachProfileSchema } from './schema';

export interface Result {
  ok?: boolean;
  error?: string;
}

export async function saveCoachProfile(raw: unknown): Promise<Result> {
  const parsed = saveCoachProfileSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };

  const sections = parsed.data;
  if (Object.keys(sections).length === 0) return { ok: true };

  const { userId } = await requireUser();
  const db = forUser(userId);

  // 1:1 con profile; forUser bloquea upsert, así que update-o-create manual.
  const upd = await db.coachProfile.updateMany({
    where: {},
    data: sections as Prisma.CoachProfileUpdateManyMutationInput,
  });
  if (upd.count === 0) {
    await db.coachProfile.create({
      data: { userId, ...sections } as Prisma.CoachProfileUncheckedCreateInput,
    });
  }

  revalidatePath('/settings/about');
  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { ok: true };
}
