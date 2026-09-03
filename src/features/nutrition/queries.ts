import 'server-only';
import type { MealType, Profile } from '@prisma/client';
import { forUser } from '@/server/user-db';
import { addDaysISO, isoToUtcDate } from '@/lib/date';
import { sumMacros, type MacroTotals } from '@/lib/nutrition/food-math';

export const MEAL_ORDER: MealType[] = ['BREAKFAST', 'LUNCH', 'MERIENDA', 'DINNER', 'SNACK'];

export interface DayEntry {
  id: string;
  mealType: MealType;
  foodId: string | null;
  name: string;
  quantity: number;
  unit: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  isEstimated: boolean;
  position: number;
}

export interface DayLog {
  dateISO: string;
  target: MacroTotals | null;
  meals: Record<MealType, DayEntry[]>;
  mealTotals: Record<MealType, MacroTotals>;
  totals: MacroTotals;
}

function emptyMeals(): Record<MealType, DayEntry[]> {
  return { BREAKFAST: [], LUNCH: [], MERIENDA: [], DINNER: [], SNACK: [] };
}

export async function getDayLog(profile: Profile, dateISO: string): Promise<DayLog> {
  const db = forUser(profile.id);
  const date = isoToUtcDate(dateISO);

  const [target, entries] = await db.$transaction([
    db.nutritionTarget.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      select: { kcal: true, proteinG: true, carbsG: true, fatG: true },
    }),
    db.foodEntry.findMany({
      where: { date },
      orderBy: [{ mealType: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
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
        position: true,
        food: { select: { name: true, brand: true } },
      },
    }),
  ]);

  const meals = emptyMeals();
  for (const e of entries) {
    meals[e.mealType].push({
      id: e.id,
      mealType: e.mealType,
      foodId: e.foodId,
      name: e.customName ?? e.food?.name ?? '—',
      quantity: e.quantity,
      unit: e.unit,
      kcal: Math.round(e.kcal),
      proteinG: Math.round(e.proteinG * 10) / 10,
      carbsG: Math.round(e.carbsG * 10) / 10,
      fatG: Math.round(e.fatG * 10) / 10,
      isEstimated: e.isEstimated,
      position: e.position,
    });
  }

  const mealTotals = {} as Record<MealType, MacroTotals>;
  for (const m of MEAL_ORDER) mealTotals[m] = sumMacros(meals[m]);
  const totals = sumMacros(MEAL_ORDER.map((m) => mealTotals[m]));

  return { dateISO, target: target ?? null, meals, mealTotals, totals };
}

export interface RecentDay {
  dateISO: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export async function getRecentDays(profile: Profile, days = 30): Promise<RecentDay[]> {
  const db = forUser(profile.id);
  const from = isoToUtcDate(addDaysISO(new Date().toISOString().slice(0, 10), -days));
  const grouped = await db.foodEntry.groupBy({
    by: ['date'],
    where: { date: { gte: from } },
    _sum: { kcal: true, proteinG: true, carbsG: true, fatG: true },
    orderBy: { date: 'desc' },
  });
  return grouped.map((g) => ({
    dateISO: g.date.toISOString().slice(0, 10),
    kcal: Math.round(g._sum.kcal ?? 0),
    proteinG: Math.round((g._sum.proteinG ?? 0) * 10) / 10,
    carbsG: Math.round((g._sum.carbsG ?? 0) * 10) / 10,
    fatG: Math.round((g._sum.fatG ?? 0) * 10) / 10,
  }));
}

export interface FrequentMeal {
  id: string;
  name: string;
  itemCount: number;
  kcal: number;
}

export async function getFrequentMeals(profile: Profile): Promise<FrequentMeal[]> {
  const db = forUser(profile.id);
  const meals = await db.meal.findMany({
    orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
    take: 30,
    select: { id: true, name: true, items: { select: { kcal: true } } },
  });
  return meals.map((m) => ({
    id: m.id,
    name: m.name,
    itemCount: m.items.length,
    kcal: Math.round(m.items.reduce((s, i) => s + i.kcal, 0)),
  }));
}
