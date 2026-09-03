'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { prisma } from '@/server/db';
import {
  appearanceSchema,
  goalUpdateSchema,
  profileUpdateSchema,
  type AppearancePayload,
  type GoalUpdatePayload,
  type ProfileUpdatePayload,
} from './schema';

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

export async function updateProfile(raw: ProfileUpdatePayload): Promise<ActionResult> {
  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const d = parsed.data;
  const { userId } = await requireUser();

  await prisma.profile.update({
    where: { id: userId },
    data: {
      name: d.name,
      sex: d.sex,
      birthdate: new Date(`${d.birthdate}T00:00:00Z`),
      heightCm: d.heightCm,
      experienceLevel: d.experienceLevel,
      trainingPlace: d.trainingPlace,
      activityLevel: d.activityLevel,
      daysAvailable: d.daysAvailable,
      sessionMinutes: d.sessionMinutes,
      equipment: d.equipment,
      dietaryPrefs: d.dietaryPrefs,
      excludedFoods: d.excludedFoods,
      allergies: d.allergies,
      mealsPerDay: d.mealsPerDay,
      injuries: d.injuries || null,
      trainingExperienceNote: d.trainingExperienceNote || null,
    },
  });

  revalidatePath('/settings/profile');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function updateAppearance(raw: AppearancePayload): Promise<ActionResult> {
  const parsed = appearanceSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();

  await prisma.profile.update({
    where: { id: userId },
    data: {
      ...(parsed.data.locale ? { locale: parsed.data.locale } : {}),
      ...(parsed.data.unitSystem ? { unitSystem: parsed.data.unitSystem } : {}),
    },
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function updateGoalAndTargets(raw: GoalUpdatePayload): Promise<ActionResult> {
  const parsed = goalUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const d = parsed.data;
  const { userId } = await requireUser();
  const db = forUser(userId);

  const today = new Date();
  const todayDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  const activeGoal = await db.goal.findFirst({ where: { status: 'ACTIVE' } });

  const ops = [];
  if (activeGoal) {
    ops.push(
      db.goal.updateMany({
        where: { id: activeGoal.id },
        data: {
          type: d.primaryGoal,
          targetWeightKg: d.targetWeightKg,
          weeklyRateKg: d.weeklyRateKg,
        },
      }),
    );
  } else {
    ops.push(
      db.goal.create({
        data: {
          userId,
          type: d.primaryGoal,
          targetWeightKg: d.targetWeightKg,
          weeklyRateKg: d.weeklyRateKg,
          status: 'ACTIVE',
        },
      }),
    );
  }
  ops.push(
    prisma.profile.update({ where: { id: userId }, data: { primaryGoal: d.primaryGoal } }),
    db.nutritionTarget.updateMany({ where: { active: true }, data: { active: false } }),
    db.nutritionTarget.create({
      data: {
        userId,
        effectiveFrom: todayDate,
        kcal: d.kcal,
        proteinG: d.proteinG,
        carbsG: d.carbsG,
        fatG: d.fatG,
        source: d.targetSource,
        active: true,
      },
    }),
  );

  await db.$transaction(ops);
  revalidatePath('/settings/goals');
  revalidatePath('/dashboard');
  return { ok: true };
}
