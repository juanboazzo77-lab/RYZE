import { describe, expect, it } from 'vitest';
import { searchLibrary } from '@/lib/nutrition/food-search';
import { readAppData, reducers } from './data';
import {
  applyFoodOp, dayData, foodAddSchema, foodUpdateSchema, itemFromEntry, itemFromEstimate, itemFromFood, itemFromManual, recentFoods,
  FOOD_ADD_OP, FOOD_DELETE_OP, FOOD_UPDATE_OP, type EntryRowData, type LibraryFood, type Nutrition,
} from './nutrition';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const food = (n: number, name: string, extra: Partial<LibraryFood> = {}): LibraryFood => ({
  id: id(n), name, brand: null, kcalPer100: 100, proteinPer100: 10, carbsPer100: 12, fatPer100: 2, servingQty: null,
  servingLabel: null, verified: false, ...extra,
});
const ARROZ = food(1, 'Arroz blanco cocido', { kcalPer100: 130, proteinPer100: 2.7, carbsPer100: 28, fatPer100: 0.3 });
const YOGUR = food(2, 'Yogur natural', { brand: 'La Granja', servingQty: 190, servingLabel: '1 pote' });

const row = (n: number, extra: Partial<EntryRowData> = {}): EntryRowData => ({
  id: id(100 + n), date: '2026-11-25', mealType: 'LUNCH', foodId: ARROZ.id, customName: null, name: ARROZ.name,
  quantity: 150, unit: 'g', kcal: 195, proteinG: 4.1, carbsG: 42, fatG: 0.5, isEstimated: false, position: n, ...extra,
});

const base = (entries: EntryRowData[] = []): Nutrition => ({
  since: '2026-09-27', target: { kcal: 2200, proteinG: 150, carbsG: 230, fatG: 70 }, entries, foods: [ARROZ, YOGUR], meals: [],
});

describe('anotar comidas sin señal', () => {
  it('calcula los valores con la biblioteca y los pone al final de la comida', () => {
    const item = itemFromFood(YOGUR, 'LUNCH', 1, 'porción', id(200));
    expect(item).toMatchObject({ kcal: 190, proteinG: 19, carbsG: 22.8, fatG: 3.8, isEstimated: false, customName: null, kind: 'food' });
    const out = applyFoodOp(base([row(0), row(1)]), FOOD_ADD_OP, { date: '2026-11-25', items: [item] });
    expect(out.entries.at(-1)).toMatchObject({ id: id(200), date: '2026-11-25', position: 2, name: 'Yogur natural' });
    expect(out.entries.at(-1)).not.toHaveProperty('kind');
  });

  it('lo que estima la IA entra con los redondeos de la web y marcado como estimado', () => {
    const item = itemFromEstimate({ name: 'Ñoquis con salsa', grams: 0.4, kcal: 412.6, proteinG: 11.26, carbsG: 63.04, fatG: 12.35 }, 'DINNER', id(205));
    expect(item).toMatchObject({ foodId: null, customName: 'Ñoquis con salsa', quantity: 1, unit: 'g', kcal: 413, proteinG: 11.3, carbsG: 63, fatG: 12.4, isEstimated: true, kind: 'ai' });
    expect(foodAddSchema.safeParse({ date: '2026-11-25', items: [item] }).success).toBe(true);
  });

  it('aplicado dos veces no duplica', () => {
    const payload = { date: '2026-11-25', items: [itemFromFood(ARROZ, 'DINNER', 100, 'g', id(201))] };
    const once = applyFoodOp(base(), FOOD_ADD_OP, payload);
    expect(applyFoodOp(once, FOOD_ADD_OP, payload)).toEqual(once);
  });

  it('una copia respeta los valores corregidos a mano; una carga a mano queda como estimada', () => {
    const tweaked = row(0, { kcal: 999, isEstimated: true });
    expect(itemFromEntry(tweaked, 'DINNER', 'duplicate', tweaked.isEstimated, id(202))).toMatchObject({ kcal: 999, foodId: ARROZ.id, customName: null, isEstimated: true });
    // Sin alimento, el nombre tiene que viajar como propio o se perdería.
    const loose = row(0, { foodId: null, name: 'Guiso de la abuela' });
    expect(itemFromEntry(loose, 'DINNER', 'copy', false, id(203)).customName).toBe('Guiso de la abuela');
    const manual = itemFromManual('Batido', { kcal: 300, proteinG: 30, carbsG: 20, fatG: 8 }, 'SNACK', 'porción', id(204));
    expect(manual).toMatchObject({ foodId: null, quantity: 1, isEstimated: true, kind: 'manual' });
    expect(foodAddSchema.safeParse({ date: '2026-11-25', items: [manual] }).success).toBe(true);
  });

  it('rechaza lo que no tiene sentido', () => {
    const good = itemFromFood(ARROZ, 'LUNCH', 100, 'g', id(205));
    for (const bad of [{ ...good, quantity: 0 }, { ...good, kcal: -1 }, { ...good, foodId: null }, { ...good, mealType: 'BRUNCH' }, { ...good, id: 'x' }]) {
      expect(foodAddSchema.safeParse({ date: '2026-11-25', items: [bad] }).success).toBe(false);
    }
    expect(foodAddSchema.safeParse({ date: '2026-11-25', items: [] }).success).toBe(false);
    expect(foodUpdateSchema.safeParse({ entryId: id(1) }).success).toBe(false);
  });
});

describe('editar, mover y eliminar sin señal', () => {
  it('al cambiar la cantidad de un alimento de la biblioteca se recalcula', () => {
    const out = applyFoodOp(base([row(0)]), FOOD_UPDATE_OP, { entryId: id(100), quantity: 300 });
    expect(out.entries[0]).toMatchObject({ quantity: 300, kcal: 390, carbsG: 84 });
  });

  it('mover no cambia los valores y va al final de la otra comida', () => {
    const tweaked = row(0, { kcal: 999 });
    const out = applyFoodOp(base([tweaked, row(3, { mealType: 'DINNER' })]), FOOD_UPDATE_OP, { entryId: id(100), mealType: 'DINNER' });
    expect(out.entries[0]).toMatchObject({ mealType: 'DINNER', kcal: 999, position: 4 });
  });

  it('en una entrada sin alimento los valores no se tocan, como en la web', () => {
    const photo = row(0, { foodId: null, name: 'Milanesa (foto)', kcal: 450 });
    const out = applyFoodOp(base([photo]), FOOD_UPDATE_OP, { entryId: id(100), quantity: 300 });
    expect(out.entries[0]).toMatchObject({ quantity: 300, kcal: 450 });
  });

  it('elimina, y un cambio sobre algo que ya no está no rompe nada', () => {
    const start = base([row(0), row(1)]);
    const out = applyFoodOp(start, FOOD_DELETE_OP, { entryId: id(100) });
    expect(out.entries.map((e) => e.id)).toEqual([id(101)]);
    expect(applyFoodOp(out, FOOD_UPDATE_OP, { entryId: id(100), quantity: 5 })).toBe(out);
    expect(applyFoodOp(out, FOOD_DELETE_OP, { roto: true })).toBe(out);
  });

  it('la pantalla lo muestra aunque siga sin subir', () => {
    const data = {
      profile: { name: null, email: 'a@example.com', timezone: 'America/Argentina/Buenos_Aires', unitSystem: 'METRIC', weekStart: 1, locale: 'ES' },
      weights: [],
      nutrition: base(),
    };
    const op = { id: id(1), type: FOOD_ADD_OP, payload: { date: '2026-11-25', items: [itemFromFood(ARROZ, 'LUNCH', 100, 'g', id(206))] }, createdAt: '2026-11-25T15:00:00.000Z' };
    expect(readAppData(reducers[FOOD_ADD_OP]!(data, op))!.nutrition!.entries).toHaveLength(1);
    const { nutrition: _n, ...older } = data;
    expect(reducers[FOOD_ADD_OP]!(older, op)).toBe(older);
  });
});

describe('el día', () => {
  it('suma por comida y en total, sólo ese día, con la marca y la referencia del alimento', () => {
    const n = base([row(0), row(1, { mealType: 'DINNER', foodId: YOGUR.id, name: YOGUR.name, kcal: 190 }), row(2, { date: '2026-11-24' })]);
    const day = dayData(n, '2026-11-25');
    expect(day.totals.kcal).toBe(385);
    expect(day.mealTotals.DINNER.kcal).toBe(190);
    expect(day.meals.DINNER[0]).toMatchObject({ brand: 'La Granja', per100: { kcal: 100 } });
    expect(dayData(n, '2026-11-20').totals.kcal).toBe(0);
  });

  it('recientes: sin repetidos, lo último primero, y cuenta las veces', () => {
    const recents = recentFoods([
      row(0, { date: '2026-11-20', quantity: 100 }),
      row(0, { date: '2026-11-24', quantity: 200 }),
      row(1, { date: '2026-11-23', foodId: null, name: 'Mate cocido' }),
      row(2, { date: '2026-11-22', foodId: null, name: ' mate cocido ' }),
    ]);
    expect(recents.map((r) => [r.last.name.trim().toLowerCase(), r.times])).toEqual([['arroz blanco cocido', 2], ['mate cocido', 2]]);
    expect(recents[0]!.last.quantity).toBe(200);
  });
});

describe('buscar sin señal', () => {
  const library = [
    food(1, 'Arroz blanco cocido', { verified: true }),
    food(2, 'Leche con arroz'),
    food(3, 'Plátano'),
    food(4, 'Yogur natural', { brand: 'La Granja' }),
    food(5, 'Arroz blanco cocido', { verified: true }),
    food(6, 'Marroz'),
  ];

  it('prioriza lo que empieza igual y esconde los repetidos', () => {
    expect(searchLibrary(library, 'arroz').map((f) => f.name)).toEqual(['Arroz blanco cocido', 'Leche con arroz', 'Marroz']);
  });

  it('ignora acentos y mayúsculas, busca por marca y por varias palabras', () => {
    expect(searchLibrary(library, 'PLATANO').map((f) => f.name)).toEqual(['Plátano']);
    expect(searchLibrary(library, 'granja').map((f) => f.name)).toEqual(['Yogur natural']);
    expect(searchLibrary(library, 'arroz leche').map((f) => f.name)).toEqual(['Leche con arroz']);
    expect(searchLibrary(library, 'a')).toEqual([]);
    expect(searchLibrary(library, 'pizza')).toEqual([]);
  });
});
