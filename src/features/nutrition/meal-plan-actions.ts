'use server';

import { revalidatePath } from 'next/cache';
import type { MealType } from '@prisma/client';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { prisma } from '@/server/db';
import { can } from '@/server/entitlements';
import { aiConfigured } from '@/server/ai/config';
import { AiError } from '@/server/ai/errors';
import { isoToUtcDate } from '@/lib/date';
import {
  addMealPlanSchema,
  generateMealPlanSchema,
  type AddMealPlanInput,
  type MealPlan,
} from './meal-plan-schema';

export interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

export async function generateMealPlanAction(raw: { brief: string }): Promise<Result<MealPlan>> {
  const parsed = generateMealPlanSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, profile, entitlement } = await requireUser();
  if (!can(entitlement, 'ai_meal_plan')) return { error: 'FORBIDDEN_TIER' };
  if (!aiConfigured()) return { error: 'NOT_CONFIGURED' };

  const target = await forUser(userId).nutritionTarget.findFirst({
    where: { active: true },
    select: { kcal: true, proteinG: true, carbsG: true, fatG: true },
  });
  if (!target) return { error: 'NO_TARGET' };

  try {
    const { generateMealPlan } = await import('@/server/ai/gateway');
    const { plan } = await generateMealPlan({ profile, entitlement, target, brief: parsed.data.brief });
    if (!plan) return { error: 'INVALID_OUTPUT' };
    return { ok: true, data: plan };
  } catch (e) {
    if (e instanceof AiError) return { error: e.code };
    console.error('[meal-plan] gen falló', e instanceof Error ? e.message : e);
    return { error: 'PROVIDER_ERROR' };
  }
}

/** Agrega todas las comidas del plan al día elegido como entradas de comida. */
export async function addMealPlanToDay(raw: AddMealPlanInput): Promise<Result<{ count: number }>> {
  const parsed = addMealPlanSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, entitlement } = await requireUser();
  if (!can(entitlement, 'ai_meal_plan')) return { error: 'FORBIDDEN_TIER' };

  const db = forUser(userId);
  const date = isoToUtcDate(parsed.data.date);

  // Alimentos de la biblioteca para linkear por nombre (mejora el re-registro).
  const library = await prisma.food.findMany({
    where: { OR: [{ source: 'SYSTEM' }, { createdById: userId }] },
    select: { id: true, name: true },
  });
  const libByName = new Map(library.map((f) => [f.name.trim().toLowerCase(), f.id]));

  const rows: Array<{
    userId: string;
    date: Date;
    mealType: MealType;
    foodId: string | null;
    customName: string | null;
    quantity: number;
    unit: string;
    kcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    isEstimated: boolean;
    source: 'AI_PARSE';
    position: number;
  }> = [];

  const basePos = new Map<MealType, number>();
  for (const m of parsed.data.meals) {
    if (!basePos.has(m.type)) {
      basePos.set(m.type, await db.foodEntry.count({ where: { date, mealType: m.type } }));
    }
    let pos = basePos.get(m.type)!;
    for (const it of m.items) {
      const foodId = libByName.get(it.name.trim().toLowerCase()) ?? null;
      rows.push({
        userId,
        date,
        mealType: m.type,
        foodId,
        customName: foodId ? null : it.name,
        quantity: Math.round(it.grams),
        unit: 'g',
        kcal: Math.round(it.kcal),
        proteinG: Math.round(it.proteinG * 10) / 10,
        carbsG: Math.round(it.carbsG * 10) / 10,
        fatG: Math.round(it.fatG * 10) / 10,
        isEstimated: true,
        source: 'AI_PARSE',
        position: pos++,
      });
    }
    basePos.set(m.type, pos);
  }

  await db.foodEntry.createMany({ data: rows });

  revalidatePath('/nutrition');
  revalidatePath('/dashboard');
  return { ok: true, data: { count: rows.length } };
}
