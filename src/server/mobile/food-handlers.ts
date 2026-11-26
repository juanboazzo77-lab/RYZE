import type { FoodEntrySource } from '@prisma/client';
import { computeEntryMacros } from '@/lib/nutrition/food-math';
import {
  editedValues, foodAddSchema, foodDeleteSchema, foodUpdateSchema, FOOD_ADD_OP, FOOD_DELETE_OP, FOOD_UPDATE_OP, type AddItem,
} from '@/lib/sync/nutrition';
import { RejectedOperation, type Handler } from './apply';
import { checkDay } from './check-day';
import type { MobileTx } from './handlers';

/** Cómo queda registrado el origen de cada cosa, con los mismos valores que usa la web. */
const SOURCE: Record<AddItem['kind'], FoodEntrySource> = {
  food: 'MANUAL',
  manual: 'MANUAL',
  duplicate: 'MANUAL',
  meal: 'FREQUENT',
  copy: 'COPIED',
};

const FOOD_MATH = { kcalPer100: true, proteinPer100: true, carbsPer100: true, fatPer100: true, servingQty: true } as const;

/** La entrada si existe y nadie la cambió después de lo que se está subiendo; si no, null (y no se toca nada). */
async function stillCurrent(tx: MobileTx, id: string, at: Date) {
  const entry = await tx.foodEntry.findFirst({
    where: { id },
    select: { id: true, date: true, mealType: true, foodId: true, quantity: true, unit: true, editedAt: true, updatedAt: true },
  });
  if (!entry) return null;
  // Gana el cambio hecho más tarde: si después de esto se corrigió (por ejemplo en la web), no se pisa.
  return (entry.editedAt ?? entry.updatedAt).getTime() > at.getTime() ? null : entry;
}

export function buildFoodHandlers({ userId, timezone }: { userId: string; timezone: string }): Record<string, Handler<MobileTx>> {
  return {
    /** Uno o varios alimentos anotados en un día. */
    [FOOD_ADD_OP]: async (tx, { payload, at }) => {
      const p = foodAddSchema.safeParse(payload);
      if (!p.success) throw new RejectedOperation('INVALID');
      const date = checkDay(p.data.date, at, timezone);

      // Los que ya están (la app lo mandó dos veces) no se repiten.
      const saved = await tx.foodEntry.findMany({ where: { id: { in: p.data.items.map((i) => i.id) } }, select: { id: true } });
      const seen = new Set(saved.map((e) => e.id));
      const fresh = p.data.items.filter((i) => !seen.has(i.id) && Boolean(seen.add(i.id)));
      if (fresh.length === 0) return;

      const foodIds = [...new Set(fresh.flatMap((i) => (i.foodId ? [i.foodId] : [])))];
      const foods = foodIds.length ? await tx.food.findMany({ where: { id: { in: foodIds } }, select: { id: true, ...FOOD_MATH } }) : [];
      const byId = new Map(foods.map((f) => [f.id, f]));

      const positions = new Map<string, number>();
      const data = [];
      for (const item of fresh) {
        const position = positions.get(item.mealType) ?? (await tx.foodEntry.count({ where: { date, mealType: item.mealType } }));
        positions.set(item.mealType, position + 1);
        // Si el alimento se borró mientras no había señal, la comida se guarda igual con lo que se veía.
        const food = item.foodId ? byId.get(item.foodId) : undefined;
        const values =
          item.kind === 'food' && food
            ? computeEntryMacros(food, item.quantity, item.unit)
            : { kcal: item.kcal, proteinG: item.proteinG, carbsG: item.carbsG, fatG: item.fatG, isEstimated: item.isEstimated };
        data.push({
          id: item.id,
          userId,
          date,
          mealType: item.mealType,
          foodId: food ? food.id : null,
          customName: food ? item.customName : (item.customName ?? item.name),
          quantity: item.quantity,
          unit: item.unit,
          ...values,
          source: SOURCE[item.kind],
          position,
          createdAt: at,
          editedAt: at,
        });
      }

      try {
        await tx.foodEntry.createMany({ data });
      } catch (err) {
        // Un identificador que ya usa otro registro: no se va a poder guardar nunca.
        if ((err as { code?: string }).code === 'P2002') throw new RejectedOperation('CONFLICT');
        throw err;
      }
    },

    /** Cambiar la cantidad o la unidad, o mover a otra comida. */
    [FOOD_UPDATE_OP]: async (tx, { payload, at }) => {
      const p = foodUpdateSchema.safeParse(payload);
      if (!p.success) throw new RejectedOperation('INVALID');
      const entry = await stillCurrent(tx, p.data.entryId, at);
      if (!entry) return;

      const food = entry.foodId ? await tx.food.findUnique({ where: { id: entry.foodId }, select: FOOD_MATH }) : null;
      const moved = p.data.mealType && p.data.mealType !== entry.mealType ? p.data.mealType : null;
      await tx.foodEntry.updateMany({
        where: { id: entry.id },
        data: {
          ...editedValues(entry, p.data, food),
          ...(moved ? { mealType: moved, position: await tx.foodEntry.count({ where: { date: entry.date, mealType: moved } }) } : {}),
          editedAt: at,
        },
      });
    },

    [FOOD_DELETE_OP]: async (tx, { payload, at }) => {
      const p = foodDeleteSchema.safeParse(payload);
      if (!p.success) throw new RejectedOperation('INVALID');
      const entry = await stillCurrent(tx, p.data.entryId, at);
      if (entry) await tx.foodEntry.deleteMany({ where: { id: entry.id } });
    },
  };
}
