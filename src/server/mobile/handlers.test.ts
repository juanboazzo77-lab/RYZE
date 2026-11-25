import { describe, expect, it } from 'vitest';
import { RejectedOperation } from './apply';
import { buildHandlers, type MobileTx } from './handlers';
import { bearerToken, corsHeaders, isInvalidSession } from './http';

type Row = { id: string; userId: string; date: Date; weightKg: number; note: string | null; editedAt: Date | null; updatedAt: Date };

function fakeDb(rows: Row[] = []) {
  const tx = {
    weightEntry: {
      async findFirst({ where }: { where: { date: Date } }) {
        return rows.find((r) => r.date.getTime() === where.date.getTime()) ?? null;
      },
      async create({ data }: { data: Omit<Row, 'id' | 'updatedAt'> }) {
        rows.push({ id: `w${rows.length}`, updatedAt: new Date(), ...data });
      },
      async updateMany({ where, data }: { where: { id: string }; data: Partial<Row> }) {
        Object.assign(rows.find((r) => r.id === where.id)!, data);
      },
    },
  } as unknown as MobileTx;
  return { tx, rows };
}

const weight = buildHandlers({ userId: 'ana', timezone: 'America/Argentina/Buenos_Aires' })['weight.log']!;
const at = (iso: string) => new Date(iso);
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('weight.log', () => {
  it('guarda el peso del día con la hora en que se anotó', async () => {
    const f = fakeDb();
    await weight(f.tx, { payload: { date: '2026-11-23', weightKg: 78.4 }, at: at('2026-11-23T11:00:00Z') });
    expect(f.rows).toMatchObject([{ userId: 'ana', date: day('2026-11-23'), weightKg: 78.4, note: null, editedAt: at('2026-11-23T11:00:00Z') }]);
  });

  it('dos cambios del mismo día sin señal: queda el último', async () => {
    const f = fakeDb();
    await weight(f.tx, { payload: { date: '2026-11-23', weightKg: 80 }, at: at('2026-11-23T11:00:00Z') });
    await weight(f.tx, { payload: { date: '2026-11-23', weightKg: 79.5, note: ' en ayunas ' }, at: at('2026-11-23T12:00:00Z') });
    expect(f.rows).toMatchObject([{ weightKg: 79.5, note: 'en ayunas' }]);
  });

  it('si se corrigió después en la web, lo viejo del teléfono no lo pisa', async () => {
    const f = fakeDb([
      { id: 'w', userId: 'ana', date: day('2026-11-23'), weightKg: 77, note: null, editedAt: at('2026-11-24T09:00:00Z'), updatedAt: at('2026-11-24T09:00:00Z') },
    ]);
    await weight(f.tx, { payload: { date: '2026-11-23', weightKg: 80 }, at: at('2026-11-23T11:00:00Z') });
    expect(f.rows[0]!.weightKg).toBe(77);
  });

  it('en filas viejas, sin fecha de edición, compara con la de modificación', async () => {
    const row = { id: 'w', userId: 'ana', date: day('2026-11-23'), weightKg: 77, note: null, editedAt: null, updatedAt: at('2026-11-23T09:00:00Z') };
    const f = fakeDb([row]);
    await weight(f.tx, { payload: { date: '2026-11-23', weightKg: 80 }, at: at('2026-11-23T08:00:00Z') });
    expect(row.weightKg).toBe(77);
    await weight(f.tx, { payload: { date: '2026-11-23', weightKg: 80 }, at: at('2026-11-23T10:00:00Z') });
    expect(row.weightKg).toBe(80);
  });

  it('rechaza datos que no tienen sentido', async () => {
    const bad = [
      null,
      { date: '2026-11-23' },
      { date: '2026-11-23', weightKg: 5 },
      { date: '2026-11-23', weightKg: 900 },
      { date: '2026-02-31', weightKg: 80 },
      { date: '23/11/2026', weightKg: 80 },
      { date: '2026-11-23', weightKg: 80, note: 'x'.repeat(201) },
    ];
    for (const payload of bad) {
      const f = fakeDb();
      await expect(weight(f.tx, { payload, at: at('2026-11-23T11:00:00Z') })).rejects.toThrow(RejectedOperation);
      expect(f.rows).toHaveLength(0);
    }
  });

  it('no acepta un día posterior a mañana respecto de cuando se anotó', async () => {
    const f = fakeDb();
    await expect(weight(f.tx, { payload: { date: '2026-11-30', weightKg: 80 }, at: at('2026-11-23T11:00:00Z') })).rejects.toThrow('FUTURE_DATE');
  });

  it('no deja que el teléfono elija de quién es el dato', async () => {
    const f = fakeDb();
    await weight(f.tx, { payload: { date: '2026-11-23', weightKg: 80, userId: 'otra-persona' }, at: at('2026-11-23T11:00:00Z') });
    expect(f.rows[0]!.userId).toBe('ana');
  });
});

describe('pedidos de la app', () => {
  it('sólo da permiso a la app instalada; la de desarrollo, nunca en producción', () => {
    expect(corsHeaders('capacitor://localhost', true)['Access-Control-Allow-Origin']).toBe('capacitor://localhost');
    expect(corsHeaders('https://localhost', true)['Access-Control-Allow-Origin']).toBe('https://localhost');
    for (const origin of ['https://sitio-ajeno.example', 'http://localhost:5175', 'https://localhost.ajeno.example', null]) {
      expect(corsHeaders(origin, true)['Access-Control-Allow-Origin']).toBeUndefined();
    }
    expect(corsHeaders('http://localhost:5175', false)['Access-Control-Allow-Origin']).toBe('http://localhost:5175');
  });

  it('lee la sesión sólo si viene bien formada', () => {
    const token = 'aaaaaaaaaa.bbbbbbbbbb.cccccccccc';
    expect(bearerToken(`Bearer ${token}`)).toBe(token);
    for (const header of [null, '', 'Bearer', 'Bearer corto', token, `Basic ${token}`, `Bearer ${token} extra`]) {
      expect(bearerToken(header)).toBeNull();
    }
  });

  it('distingue sesión inválida de no haber podido comprobarla', () => {
    expect([401, 403, 400].map(isInvalidSession)).toEqual([true, true, true]);
    expect([undefined, 0, 408, 429, 500, 503].map(isInvalidSession)).toEqual([false, false, false, false, false, false]);
  });
});
