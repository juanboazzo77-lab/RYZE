import { describe, expect, it } from 'vitest';
import { RejectedOperation } from './apply';
import { buildHandlers, type MobileTx } from './handlers';

type Row = { id: string; userId: string; date: Date; editedAt: Date | null; updatedAt: Date; [key: string]: unknown };

function table(rows: Row[]) {
  return {
    async findFirst({ where }: { where: { date: Date } }) {
      return rows.find((r) => r.date.getTime() === where.date.getTime()) ?? null;
    },
    async create({ data }: { data: Omit<Row, 'id' | 'updatedAt'> }) {
      rows.push({ id: `r${rows.length}`, updatedAt: new Date(), ...data } as Row);
    },
    async updateMany({ where, data }: { where: { id: string }; data: Partial<Row> }) {
      Object.assign(rows.find((r) => r.id === where.id)!, data);
    },
    async deleteMany({ where }: { where: { id: string } }) {
      rows.splice(rows.findIndex((r) => r.id === where.id), 1);
    },
  };
}

const at = (iso: string) => new Date(iso);
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const handlers = buildHandlers({ userId: 'ana', timezone: 'America/Argentina/Buenos_Aires' });

function fake(weights: Row[] = [], activity: Row[] = []) {
  const tx = { weightEntry: table(weights), dailyActivity: table(activity) } as unknown as MobileTx;
  const run = (type: string, payload: unknown, when = '2026-11-25T15:00:00Z') => handlers[type]!(tx, { payload, at: at(when) });
  return { run, weights, activity };
}

const row = (extra: Record<string, unknown> = {}): Row => ({
  id: 'x', userId: 'ana', date: day('2026-11-24'), editedAt: at('2026-11-24T12:00:00Z'), updatedAt: at('2026-11-24T12:00:00Z'), ...extra,
});

describe('weight.delete', () => {
  it('borra el peso de ese día; repetirlo no falla', async () => {
    const f = fake([row({ weightKg: 80 })]);
    await f.run('weight.delete', { date: '2026-11-24' });
    await f.run('weight.delete', { date: '2026-11-24' });
    expect(f.weights).toEqual([]);
  });

  it('si se volvió a cargar después en la web, no se borra', async () => {
    const f = fake([row({ weightKg: 79, editedAt: at('2026-11-25T20:00:00Z') })]);
    await f.run('weight.delete', { date: '2026-11-24' });
    expect(f.weights).toHaveLength(1);
  });

  it('anotar y borrar sin señal, en orden, deja el día vacío', async () => {
    const f = fake();
    await f.run('weight.log', { date: '2026-11-24', weightKg: 80 }, '2026-11-24T10:00:00Z');
    await f.run('weight.delete', { date: '2026-11-24' }, '2026-11-24T10:05:00Z');
    expect(f.weights).toEqual([]);
  });
});

describe('pasos', () => {
  it('guarda un registro por día y gana el último', async () => {
    const f = fake();
    await f.run('activity.log', { date: '2026-11-25', steps: 4000 }, '2026-11-25T12:00:00Z');
    await f.run('activity.log', { date: '2026-11-25', steps: 9000, activeMinutes: 45 }, '2026-11-25T14:00:00Z');
    expect(f.activity).toMatchObject([{ userId: 'ana', date: day('2026-11-25'), steps: 9000, activeMinutes: 45, editedAt: at('2026-11-25T14:00:00Z') }]);
  });

  it('lo viejo del teléfono no pisa ni borra lo corregido después en la web', async () => {
    const f = fake([], [row({ steps: 12000, activeMinutes: null, editedAt: at('2026-11-25T20:00:00Z') })]);
    await f.run('activity.log', { date: '2026-11-24', steps: 100 });
    await f.run('activity.delete', { date: '2026-11-24' });
    expect(f.activity).toMatchObject([{ steps: 12000 }]);
    await f.run('activity.delete', { date: '2026-11-24' }, '2026-11-25T21:00:00Z');
    expect(f.activity).toEqual([]);
  });

  it('rechaza datos sin sentido y fechas futuras', async () => {
    const f = fake();
    for (const [type, payload] of [
      ['activity.log', { date: '2026-11-25', steps: -1 }],
      ['activity.log', { date: '2026-11-25', steps: 1.5 }],
      ['activity.log', { date: '2026-11-25', steps: 10, activeMinutes: 2000 }],
      ['activity.log', { date: '2026-12-25', steps: 10 }],
      ['activity.delete', { date: 'ayer' }],
      ['weight.delete', {}],
    ] as const) {
      await expect(f.run(type, payload)).rejects.toThrow(RejectedOperation);
    }
    expect(f.activity).toEqual([]);
  });
});
