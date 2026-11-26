import type { PrismaClient } from '@prisma/client';
import { addDaysISO, isoToUtcDate, localTodayISO } from '@/lib/date';
import { MAX_FOODS, NUTRITION_DAYS, type LibraryFood, type Nutrition } from '@/lib/sync/nutrition';
import { DateTime } from 'luxon';

export type NutritionDb = Pick<PrismaClient, 'nutritionTarget' | 'foodEntry' | 'food' | 'meal'>;

const MAX_SAVED_MEALS = 30;

/** Campo por campo: quién cargó un alimento o su código no viajan al teléfono. */
const LIBRARY_FIELDS = {
  id: true,
  name: true,
  brand: true,
  kcalPer100: true,
  proteinPer100: true,
  carbsPer100: true,
  fatPer100: true,
  servingQty: true,
  servingLabel: true,
  verified: true,
} as const;

const one = (n: number) => Math.round(n * 10) / 10;
/** Los mismos redondeos que muestra la web. */
const shown = (m: { kcal: number; proteinG: number; carbsG: number; fatG: number }) => ({
  kcal: Math.round(m.kcal),
  proteinG: one(m.proteinG),
  carbsG: one(m.carbsG),
  fatG: one(m.fatG),
});

/** La biblioteca entera (es compartida entre todos) más, si quedó afuera del tope, lo que esta persona usó. */
async function library(db: NutritionDb, used: string[]): Promise<LibraryFood[]> {
  const foods = await db.food.findMany({ orderBy: [{ verified: 'desc' }, { createdAt: 'asc' }], take: MAX_FOODS, select: LIBRARY_FIELDS });
  const have = new Set(foods.map((f) => f.id));
  const missing = [...new Set(used)].filter((id) => !have.has(id));
  return missing.length ? [...foods, ...(await db.food.findMany({ where: { id: { in: missing } }, select: LIBRARY_FIELDS }))] : foods;
}

/** `db` tiene que venir acotada a la persona (`forUser`). */
export async function nutritionSnapshot(db: NutritionDb, timezone: string, now: Date): Promise<Nutrition> {
  const since = addDaysISO(localTodayISO(timezone, DateTime.fromJSDate(now)), -(NUTRITION_DAYS - 1));
  const target = await db.nutritionTarget.findFirst({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    select: { kcal: true, proteinG: true, carbsG: true, fatG: true },
  });
  const entries = await db.foodEntry.findMany({
    where: { date: { gte: isoToUtcDate(since) } },
    orderBy: [{ date: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      date: true,
      mealType: true,
      foodId: true,
      customName: true,
      quantity: true,
      unit: true,
      kcal: true,
      proteinG: true,
      carbsG: true,
      fatG: true,
      isEstimated: true,
      food: { select: { name: true } },
    },
  });
  const meals = await db.meal.findMany({
    orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
    take: MAX_SAVED_MEALS,
    select: {
      id: true,
      name: true,
      items: {
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
      },
    },
  });

  return {
    since,
    target,
    // La posición va corrida (0, 1, 2…) en el orden en que la web las muestra: así lo nuevo siempre queda al final.
    entries: entries.map(({ food, date, customName, ...e }, position) => ({
      ...e,
      ...shown(e),
      date: date.toISOString().slice(0, 10),
      customName,
      name: customName ?? food?.name ?? '—',
      position,
    })),
    foods: await library(db, [...entries, ...meals.flatMap((m) => m.items)].flatMap((e) => (e.foodId ? [e.foodId] : []))),
    meals: meals.map((m) => ({
      id: m.id,
      name: m.name,
      items: m.items.map(({ food, ...i }) => ({ ...i, ...shown(i), name: i.customName ?? food?.name ?? '—' })),
    })),
  };
}
