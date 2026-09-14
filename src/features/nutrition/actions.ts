'use server';

import { revalidatePath } from 'next/cache';
import type { MealType } from '@prisma/client';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { prisma } from '@/server/db';
import { isoToUtcDate } from '@/lib/date';
import { computeEntryMacros } from '@/lib/nutrition/food-math';
import {
  addEntrySchema,
  addMealToDaySchema,
  barcodeSchema,
  copyDaySchema,
  createFoodSchema,
  idSchema,
  saveMealSchema,
  updateEntrySchema,
  type AddEntryInput,
  type AddMealToDayInput,
  type CopyDayInput,
  type CreateFoodInput,
  type SaveMealInput,
  type UpdateEntryInput,
} from './schema';

export interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

function refresh() {
  revalidatePath('/nutrition');
  revalidatePath('/nutrition/history');
  revalidatePath('/dashboard');
}

async function nextPosition(
  db: ReturnType<typeof forUser>,
  date: Date,
  mealType: MealType,
): Promise<number> {
  const count = await db.foodEntry.count({ where: { date, mealType } });
  return count;
}

/** Alimento accesible por el usuario: SYSTEM, propio (USER), o de una API
 * pública como Open Food Facts (source API, sin dueño, se comparte). */
async function loadUsableFood(foodId: string, userId: string) {
  const food = await prisma.food.findUnique({ where: { id: foodId } });
  if (!food) return null;
  if (food.source === 'USER' && food.createdById !== userId) return null;
  return food;
}

export async function addFoodEntry(raw: AddEntryInput): Promise<Result<{ id: string }>> {
  const parsed = addEntrySchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const d = parsed.data;
  const { userId, profile } = await requireUser();
  const db = forUser(userId);
  const date = isoToUtcDate(d.date);

  let name = d.customName ?? null;
  let macros = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, isEstimated: true };

  if (d.foodId) {
    const food = await loadUsableFood(d.foodId, userId);
    if (!food) return { error: 'FOOD_NOT_FOUND' };
    macros = computeEntryMacros(food, d.quantity, d.unit);
    name = d.customName ?? null; // el nombre "real" se resuelve desde food en las queries
  } else if (d.manualMacros) {
    macros = { ...d.manualMacros, isEstimated: true };
  }

  const position = await nextPosition(db, date, d.mealType);
  const entry = await db.foodEntry.create({
    data: {
      userId,
      date,
      mealType: d.mealType,
      foodId: d.foodId ?? null,
      customName: name,
      quantity: d.quantity,
      unit: d.unit,
      kcal: macros.kcal,
      proteinG: macros.proteinG,
      carbsG: macros.carbsG,
      fatG: macros.fatG,
      isEstimated: macros.isEstimated,
      source: 'MANUAL',
      position,
    },
    select: { id: true },
  });

  const { syncAchievements } = await import('@/features/gamification/sync');
  await syncAchievements(db, userId, profile.timezone);
  refresh();
  return { ok: true, data: { id: entry.id } };
}

export async function updateFoodEntry(raw: UpdateEntryInput): Promise<Result> {
  const parsed = updateEntrySchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const p = parsed.data;
  const { userId } = await requireUser();
  const db = forUser(userId);

  const entry = await db.foodEntry.findFirst({ where: { id: p.id } });
  if (!entry) return { error: 'NOT_FOUND' };

  const quantity = p.quantity ?? entry.quantity;
  const unit = p.unit ?? entry.unit;
  const qtyOrUnitChanged = quantity !== entry.quantity || unit !== entry.unit;

  const data: Record<string, unknown> = {
    quantity,
    unit,
    ...(p.mealType ? { mealType: p.mealType } : {}),
    ...(p.customName ? { customName: p.customName } : {}),
  };

  if (p.macros) {
    Object.assign(data, { ...p.macros, isEstimated: true });
  } else if (entry.foodId && qtyOrUnitChanged) {
    const food = await loadUsableFood(entry.foodId, userId);
    if (food) {
      const m = computeEntryMacros(food, quantity, unit);
      Object.assign(data, {
        kcal: m.kcal,
        proteinG: m.proteinG,
        carbsG: m.carbsG,
        fatG: m.fatG,
        isEstimated: m.isEstimated,
      });
    }
  }

  await db.foodEntry.updateMany({ where: { id: p.id }, data });
  refresh();
  return { ok: true };
}

export async function deleteFoodEntry(raw: { id: string }): Promise<Result> {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  await forUser(userId).foodEntry.deleteMany({ where: { id: parsed.data.id } });
  refresh();
  return { ok: true };
}

export async function duplicateFoodEntry(raw: { id: string }): Promise<Result> {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const db = forUser(userId);

  const e = await db.foodEntry.findFirst({ where: { id: parsed.data.id } });
  if (!e) return { error: 'NOT_FOUND' };

  const position = await nextPosition(db, e.date, e.mealType);
  await db.foodEntry.create({
    data: {
      userId,
      date: e.date,
      mealType: e.mealType,
      foodId: e.foodId,
      customName: e.customName,
      quantity: e.quantity,
      unit: e.unit,
      kcal: e.kcal,
      proteinG: e.proteinG,
      carbsG: e.carbsG,
      fatG: e.fatG,
      isEstimated: e.isEstimated,
      source: 'MANUAL',
      position,
    },
  });
  refresh();
  return { ok: true };
}

export async function createCustomFood(raw: CreateFoodInput): Promise<Result<{ id: string }>> {
  const parsed = createFoodSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const f = parsed.data;
  const { userId } = await requireUser();

  const food = await prisma.food.create({
    data: {
      name: f.name,
      brand: f.brand || null,
      source: 'USER',
      createdById: userId,
      kcalPer100: f.kcalPer100,
      proteinPer100: f.proteinPer100,
      carbsPer100: f.carbsPer100,
      fatPer100: f.fatPer100,
      servingQty: f.servingQty ?? null,
      servingUnit: f.servingQty ? 'g' : null,
      servingLabel: f.servingLabel || null,
    },
    select: { id: true },
  });
  return { ok: true, data: { id: food.id } };
}

export async function saveMealFromDay(raw: SaveMealInput): Promise<Result> {
  const parsed = saveMealSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const s = parsed.data;
  const { userId } = await requireUser();
  const db = forUser(userId);

  const entries = await db.foodEntry.findMany({
    where: { date: isoToUtcDate(s.date), mealType: s.mealType },
    orderBy: { position: 'asc' },
    select: {
      foodId: true,
      customName: true,
      quantity: true,
      unit: true,
      kcal: true,
      proteinG: true,
      carbsG: true,
      fatG: true,
      food: { select: { name: true } },
    },
  });
  if (entries.length === 0) return { error: 'EMPTY' };

  await db.meal.create({
    data: {
      userId,
      name: s.name,
      items: {
        create: entries.map((e, i) => ({
          foodId: e.foodId,
          customName: e.customName ?? e.food?.name ?? null,
          quantity: e.quantity,
          unit: e.unit,
          kcal: e.kcal,
          proteinG: e.proteinG,
          carbsG: e.carbsG,
          fatG: e.fatG,
          position: i,
        })),
      },
    },
  });
  revalidatePath('/nutrition');
  return { ok: true };
}

export async function addMealToDay(raw: AddMealToDayInput): Promise<Result> {
  const parsed = addMealToDaySchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const a = parsed.data;
  const { userId } = await requireUser();
  const db = forUser(userId);
  const date = isoToUtcDate(a.date);

  const meal = await db.meal.findFirst({
    where: { id: a.mealId },
    select: { items: { orderBy: { position: 'asc' } } },
  });
  if (!meal || meal.items.length === 0) return { error: 'NOT_FOUND' };

  const base = await nextPosition(db, date, a.mealType);
  await db.foodEntry.createMany({
    data: meal.items.map((it, i) => ({
      userId,
      date,
      mealType: a.mealType,
      foodId: it.foodId,
      customName: it.customName,
      quantity: it.quantity,
      unit: it.unit,
      kcal: it.kcal,
      proteinG: it.proteinG,
      carbsG: it.carbsG,
      fatG: it.fatG,
      isEstimated: false,
      source: 'FREQUENT' as const,
      position: base + i,
    })),
  });
  refresh();
  return { ok: true };
}

export async function copyDay(raw: CopyDayInput): Promise<Result<{ count: number }>> {
  const parsed = copyDaySchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const c = parsed.data;
  if (c.fromDate === c.toDate) return { error: 'SAME_DAY' };
  const { userId } = await requireUser();
  const db = forUser(userId);
  const toDate = isoToUtcDate(c.toDate);

  const src = await db.foodEntry.findMany({
    where: {
      date: isoToUtcDate(c.fromDate),
      ...(c.mealTypes ? { mealType: { in: c.mealTypes } } : {}),
    },
    orderBy: [{ mealType: 'asc' }, { position: 'asc' }],
  });
  if (src.length === 0) return { error: 'EMPTY' };

  // posición base por meal en el día destino
  const bases = new Map<MealType, number>();
  for (const m of new Set(src.map((e) => e.mealType))) {
    bases.set(m, await nextPosition(db, toDate, m));
  }
  const counters = new Map<MealType, number>();

  await db.foodEntry.createMany({
    data: src.map((e) => {
      const n = counters.get(e.mealType) ?? 0;
      counters.set(e.mealType, n + 1);
      return {
        userId,
        date: toDate,
        mealType: e.mealType,
        foodId: e.foodId,
        customName: e.customName,
        quantity: e.quantity,
        unit: e.unit,
        kcal: e.kcal,
        proteinG: e.proteinG,
        carbsG: e.carbsG,
        fatG: e.fatG,
        isEstimated: e.isEstimated,
        source: 'COPIED' as const,
        position: (bases.get(e.mealType) ?? 0) + n,
      };
    }),
  });
  refresh();
  return { ok: true, data: { count: src.length } };
}

/** Buscador de alimentos para el diálogo de alta (Server Action). */
export async function searchFoodAction(query: string) {
  const { userId } = await requireUser();
  const { searchFoods } = await import('@/server/nutrition/food-provider');
  return searchFoods(userId, query, 20);
}

/**
 * Resuelve un código de barras a un alimento (biblioteca local u Open Food
 * Facts). El diálogo de alta usa el resultado para precargar los macros y
 * dejar que el usuario ajuste la cantidad antes de guardar.
 */
export async function lookupBarcodeAction(rawBarcode: string) {
  const parsed = barcodeSchema.safeParse(rawBarcode);
  if (!parsed.success) return { status: 'not_found' as const };
  const { userId } = await requireUser();
  const { lookupBarcode } = await import('@/server/nutrition/food-provider');
  return lookupBarcode(userId, parsed.data);
}

/**
 * Estima una comida a partir de una foto (+ descripción opcional). La foto vive
 * SÓLO en esta variable local: se manda al modelo y se descarta. Devuelve el
 * estimado para que el usuario lo ajuste antes de guardar.
 */
export async function estimateMealPhotoAction(raw: {
  photo: string;
  note?: string;
}): Promise<Result<import('./meal-photo-schema').MealPhotoEstimate>> {
  const { estimateMealPhotoSchema } = await import('./meal-photo-schema');
  const parsed = estimateMealPhotoSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, profile } = await requireUser();
  const { aiConfigured } = await import('@/server/ai/config');
  if (!aiConfigured()) return { error: 'NOT_CONFIGURED' };

  try {
    const { estimateMealFromPhoto } = await import('@/server/ai/gateway');
    const est = await estimateMealFromPhoto({
      userId,
      timezone: profile.timezone,
      locale: profile.locale,
      photo: parsed.data.photo,
      note: parsed.data.note,
    });
    if (!est) return { error: 'INVALID_OUTPUT' };
    return { ok: true, data: est };
  } catch (e) {
    console.error('[meal-photo] falló', e instanceof Error ? e.message : e);
    return { error: 'PROVIDER_ERROR' };
  }
}

/**
 * Estima una comida a partir de sólo una descripción de texto (sin foto).
 * Mismo formato de salida que la estimación por foto, para reusar la misma UI
 * de ajuste de cantidades antes de guardar.
 */
export async function estimateMealTextAction(raw: {
  description: string;
}): Promise<Result<import('./meal-photo-schema').MealPhotoEstimate>> {
  const { estimateMealTextSchema } = await import('./meal-photo-schema');
  const parsed = estimateMealTextSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, profile } = await requireUser();
  const { aiConfigured } = await import('@/server/ai/config');
  if (!aiConfigured()) return { error: 'NOT_CONFIGURED' };

  try {
    const { estimateMealFromText } = await import('@/server/ai/gateway');
    const est = await estimateMealFromText({
      userId,
      timezone: profile.timezone,
      locale: profile.locale,
      description: parsed.data.description,
    });
    if (!est) return { error: 'INVALID_OUTPUT' };
    return { ok: true, data: est };
  } catch (e) {
    console.error('[meal-text] falló', e instanceof Error ? e.message : e);
    return { error: 'PROVIDER_ERROR' };
  }
}

/** Agrega al día los items estimados de una foto (ya ajustados por el usuario). */
export async function addPhotoMealEntries(
  raw: import('./meal-photo-schema').AddPhotoMealInput,
): Promise<Result<{ count: number }>> {
  const { addPhotoMealSchema } = await import('./meal-photo-schema');
  const parsed = addPhotoMealSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { date, mealType, items } = parsed.data;
  const { userId, profile } = await requireUser();
  const db = forUser(userId);
  const d = isoToUtcDate(date);

  const base = await nextPosition(db, d, mealType);
  await db.foodEntry.createMany({
    data: items.map((it, i) => ({
      userId,
      date: d,
      mealType,
      customName: it.name,
      quantity: Math.max(1, Math.round(it.grams)),
      unit: 'g',
      kcal: Math.round(it.kcal),
      proteinG: Math.round(it.proteinG * 10) / 10,
      carbsG: Math.round(it.carbsG * 10) / 10,
      fatG: Math.round(it.fatG * 10) / 10,
      isEstimated: true,
      source: 'AI_PARSE' as const,
      position: base + i,
    })),
  });

  const { syncAchievements } = await import('@/features/gamification/sync');
  await syncAchievements(db, userId, profile.timezone);
  refresh();
  return { ok: true, data: { count: items.length } };
}
