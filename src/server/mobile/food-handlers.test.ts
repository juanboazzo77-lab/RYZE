import { describe, expect, it } from 'vitest';
import { itemFromEstimate, itemFromFood, itemFromManual, type LibraryFood } from '@/lib/sync/nutrition';
import { RejectedOperation } from './apply';
import { buildHandlers, type MobileTx } from './handlers';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const at = (iso: string) => new Date(iso);

const ARROZ: LibraryFood = {
  id: id(1), name: 'Arroz blanco cocido', brand: null, kcalPer100: 130, proteinPer100: 2.7, carbsPer100: 28, fatPer100: 0.3,
  servingQty: null, servingLabel: null, verified: true,
};

type Row = {
  id: string; userId: string; date: Date; mealType: string; foodId: string | null; customName: string | null; quantity: number;
  unit: string; kcal: number; proteinG: number; carbsG: number; fatG: number; isEstimated: boolean; source: string;
  position: number; editedAt: Date | null; updatedAt: Date;
};

function fakeDb(rows: Row[] = [], foods: LibraryFood[] = [ARROZ]) {
  const tx = {
    food: {
      async findMany({ where }: { where: { id: { in: string[] } } }) {
        return foods.filter((f) => where.id.in.includes(f.id));
      },
      async findUnique({ where }: { where: { id: string } }) {
        return foods.find((f) => f.id === where.id) ?? null;
      },
    },
    foodEntry: {
      async findMany({ where }: { where: { id: { in: string[] } } }) {
        return rows.filter((r) => where.id.in.includes(r.id));
      },
      async findFirst({ where }: { where: { id: string } }) {
        return rows.find((r) => r.id === where.id) ?? null;
      },
      async count({ where }: { where: { date: Date; mealType: string } }) {
        return rows.filter((r) => r.date.getTime() === where.date.getTime() && r.mealType === where.mealType).length;
      },
      async createMany({ data }: { data: Row[] }) {
        rows.push(...data.map((d) => ({ ...d, updatedAt: new Date() })));
      },
      async updateMany({ where, data }: { where: { id: string }; data: Partial<Row> }) {
        Object.assign(rows.find((r) => r.id === where.id)!, data);
      },
      async deleteMany({ where }: { where: { id: string } }) {
        rows.splice(rows.findIndex((r) => r.id === where.id), 1);
      },
    },
  } as unknown as MobileTx;
  return { tx, rows };
}

const handlers = buildHandlers({ userId: 'ana', timezone: 'America/Argentina/Buenos_Aires' });
const run = (type: string, tx: MobileTx, payload: unknown, when = '2026-11-25T15:00:00Z') => handlers[type]!(tx, { payload, at: at(when) });

const existing = (extra: Partial<Row> = {}): Row => ({
  id: id(100), userId: 'ana', date: day('2026-11-25'), mealType: 'LUNCH', foodId: ARROZ.id, customName: null, quantity: 100,
  unit: 'g', kcal: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3, isEstimated: false, source: 'MANUAL', position: 0,
  editedAt: at('2026-11-25T12:00:00Z'), updatedAt: at('2026-11-25T12:00:00Z'), ...extra,
});

describe('food.add', () => {
  it('lo estimado por la IA queda con el mismo origen que en la web y con los valores del teléfono', async () => {
    const f = fakeDb();
    const item = itemFromEstimate({ name: 'Tarta de verdura', grams: 250, kcal: 480, proteinG: 18, carbsG: 40, fatG: 27 }, 'LUNCH', id(210));
    await run('food.add', f.tx, { date: '2026-11-25', items: [item] });
    expect(f.rows[0]).toMatchObject({ foodId: null, customName: 'Tarta de verdura', quantity: 250, unit: 'g', kcal: 480, isEstimated: true, source: 'AI_PARSE' });
  });

  it('guarda con el identificador y la hora del teléfono, y calcula los valores con la biblioteca', async () => {
    const f = fakeDb([existing()]);
    const item = { ...itemFromFood(ARROZ, 'LUNCH', 200, 'g', id(200)), kcal: 1 };
    await run('food.add', f.tx, { date: '2026-11-25', items: [item] });
    expect(f.rows[1]).toMatchObject({
      id: id(200), userId: 'ana', date: day('2026-11-25'), foodId: ARROZ.id, customName: null, kcal: 260, source: 'MANUAL',
      position: 1, editedAt: at('2026-11-25T15:00:00Z'),
    });
  });

  it('varios juntos quedan en orden; mandado dos veces no se repite', async () => {
    const f = fakeDb();
    const payload = {
      date: '2026-11-25',
      items: [
        itemFromFood(ARROZ, 'DINNER', 100, 'g', id(201)),
        itemFromManual('Flan', { kcal: 250, proteinG: 6, carbsG: 40, fatG: 7 }, 'DINNER', 'porción', id(202)),
        itemFromFood(ARROZ, 'SNACK', 50, 'g', id(203)),
      ],
    };
    await run('food.add', f.tx, payload);
    await run('food.add', f.tx, payload);
    expect(f.rows.map((r) => [r.mealType, r.position, r.customName])).toEqual([['DINNER', 0, null], ['DINNER', 1, 'Flan'], ['SNACK', 0, null]]);
    expect(f.rows[1]).toMatchObject({ kcal: 250, isEstimated: true, foodId: null });
  });

  it('una copia conserva los valores que tenía', async () => {
    const f = fakeDb();
    const item = { ...itemFromFood(ARROZ, 'LUNCH', 100, 'g', id(204)), kcal: 999, kind: 'copy' as const };
    await run('food.add', f.tx, { date: '2026-11-25', items: [item] });
    expect(f.rows[0]).toMatchObject({ kcal: 999, source: 'COPIED', foodId: ARROZ.id });
  });

  it('si el alimento ya no existe, la comida no se pierde', async () => {
    const f = fakeDb([], []);
    await run('food.add', f.tx, { date: '2026-11-25', items: [itemFromFood(ARROZ, 'LUNCH', 100, 'g', id(205))] });
    expect(f.rows[0]).toMatchObject({ foodId: null, customName: 'Arroz blanco cocido', kcal: 130 });
  });

  it('rechaza datos sin sentido y fechas futuras', async () => {
    const f = fakeDb();
    const item = itemFromFood(ARROZ, 'LUNCH', 100, 'g', id(206));
    for (const payload of [null, { date: '2026-11-25', items: [] }, { date: '2026-02-31', items: [item] }, { date: '2026-11-25', items: [{ ...item, quantity: -1 }] }]) {
      await expect(run('food.add', f.tx, payload)).rejects.toThrow(RejectedOperation);
    }
    await expect(run('food.add', f.tx, { date: '2026-11-28', items: [item] })).rejects.toThrow('FUTURE_DATE');
    expect(f.rows).toEqual([]);
  });
});

describe('food.update y food.delete', () => {
  it('cambiar la cantidad recalcula; mover lo pone al final de la otra comida', async () => {
    const f = fakeDb([existing(), existing({ id: id(101), mealType: 'DINNER' })]);
    await run('food.update', f.tx, { entryId: id(100), quantity: 300 });
    expect(f.rows[0]).toMatchObject({ quantity: 300, kcal: 390, editedAt: at('2026-11-25T15:00:00Z') });
    await run('food.update', f.tx, { entryId: id(100), mealType: 'DINNER' }, '2026-11-25T15:01:00Z');
    expect(f.rows[0]).toMatchObject({ mealType: 'DINNER', position: 1, kcal: 390 });
  });

  it('si se corrigió después en la web, lo viejo del teléfono no lo pisa ni lo borra', async () => {
    const f = fakeDb([existing({ quantity: 120, editedAt: at('2026-11-25T18:00:00Z') })]);
    await run('food.update', f.tx, { entryId: id(100), quantity: 300 });
    await run('food.delete', f.tx, { entryId: id(100) });
    expect(f.rows).toMatchObject([{ quantity: 120 }]);
  });

  it('en filas viejas sin fecha de edición compara con la de modificación', async () => {
    const f = fakeDb([existing({ editedAt: null, updatedAt: at('2026-11-25T12:00:00Z') })]);
    await run('food.delete', f.tx, { entryId: id(100) }, '2026-11-25T11:00:00Z');
    expect(f.rows).toHaveLength(1);
    await run('food.delete', f.tx, { entryId: id(100) }, '2026-11-25T13:00:00Z');
    expect(f.rows).toHaveLength(0);
  });

  it('sobre algo que ya no está no falla; sin cambios se rechaza', async () => {
    const f = fakeDb();
    await run('food.update', f.tx, { entryId: id(100), quantity: 3 });
    await run('food.delete', f.tx, { entryId: id(100) });
    await expect(run('food.update', f.tx, { entryId: id(100) })).rejects.toThrow(RejectedOperation);
  });
});
