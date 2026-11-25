import { describe, expect, it } from 'vitest';
import type { Operation } from '@/lib/sync/protocol';
import { applyOperations, RejectedOperation, type Handler, type SyncLog, type SyncRecord } from './apply';

type Tx = { changes: unknown[] };

function fakeLog() {
  const records = new Map<string, SyncRecord>();
  const changes: unknown[] = [];
  const log: SyncLog<Tx> = {
    async find(id) {
      return records.get(id) ?? null;
    },
    async applyOnce(op, _at, change) {
      if (records.has(op.id)) throw new Error('unique violation');
      const tx: Tx = { changes: [] };
      await change(tx); // si falla, no queda nada
      changes.push(...tx.changes);
      records.set(op.id, { status: 'applied', reason: null });
    },
    async recordRejected(op, _at, reason) {
      records.set(op.id, { status: 'rejected', reason });
    },
  };
  return { log, records, changes };
}

const handlers: Record<string, Handler<Tx>> = {
  add: async (tx, { payload }) => {
    if (payload === 'mal') throw new RejectedOperation('INVALID');
    tx.changes.push(payload);
    if (payload === 'falla') throw new Error('base caída');
  },
};

const NOW = new Date('2026-11-25T12:00:00.000Z');
const op = (n: number, payload: unknown, type = 'add', createdAt = '2026-11-25T10:00:00.000Z'): Operation => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  type,
  payload,
  createdAt,
});

const run = (log: SyncLog<Tx>, operations: Operation[], extra: Partial<Parameters<typeof applyOperations<Tx>>[0]> = {}) =>
  applyOperations({ operations, log, handlers, now: NOW, ...extra });

const statuses = (r: Array<{ status: string }>) => r.map((x) => x.status);

describe('applyOperations', () => {
  it('aplica en orden', async () => {
    const f = fakeLog();
    expect(statuses(await run(f.log, [op(1, 'a'), op(2, 'b')]))).toEqual(['applied', 'applied']);
    expect(f.changes).toEqual(['a', 'b']);
  });

  it('un reintento no aplica dos veces', async () => {
    const f = fakeLog();
    await run(f.log, [op(1, 'a')]);
    expect(statuses(await run(f.log, [op(1, 'a')]))).toEqual(['duplicate']);
    expect(f.changes).toEqual(['a']);
  });

  it('lo inválido se rechaza, no frena a los demás y al reintentar se responde igual', async () => {
    const f = fakeLog();
    expect(statuses(await run(f.log, [op(1, 'a'), op(2, 'mal'), op(3, 'c')]))).toEqual(['applied', 'rejected', 'applied']);
    expect(await run(f.log, [op(2, 'mal')])).toEqual([{ id: op(2, '').id, status: 'rejected', reason: 'INVALID' }]);
    expect(f.changes).toEqual(['a', 'c']);
  });

  it('ante una falla pasajera corta: lo siguiente no se adelanta y nada queda a medias', async () => {
    const f = fakeLog();
    const errors: string[] = [];
    const res = await run(f.log, [op(1, 'a'), op(2, 'falla'), op(3, 'c')], { onError: (o) => errors.push(o.id) });
    expect(res.map((r) => r.id)).toEqual([op(1, '').id]);
    expect(f.changes).toEqual(['a']);
    expect(f.records.size).toBe(1);
    expect(errors).toEqual([op(2, '').id]);
  });

  it('un tipo que el servidor no conoce se rechaza sin anotarlo', async () => {
    const f = fakeLog();
    for (const type of ['otra.cosa', 'constructor', '__proto__']) {
      expect(await run(f.log, [op(1, 'a', type)])).toMatchObject([{ status: 'rejected', reason: 'UNKNOWN_TYPE' }]);
    }
    expect(f.records.size).toBe(0);
  });

  it('si dos envíos del mismo cambio chocan, el segundo responde que ya estaba', async () => {
    const f = fakeLog();
    let first = true;
    const log: SyncLog<Tx> = {
      ...f.log,
      async find(id) {
        // El primer vistazo todavía no lo ve: el otro envío lo está guardando.
        if (first) {
          first = false;
          f.records.set(id, { status: 'applied', reason: null });
          return null;
        }
        return f.log.find(id);
      },
    };
    expect(statuses(await run(log, [op(1, 'a')]))).toEqual(['duplicate']);
    expect(f.changes).toEqual([]);
  });

  it('usa la hora del teléfono, pero nunca una del futuro', async () => {
    const f = fakeLog();
    const seen: string[] = [];
    await run(f.log, [op(1, 'a', 'add', '2026-11-20T08:00:00.000Z'), op(2, 'b', 'add', '2027-01-01T00:00:00.000Z')], {
      handlers: { add: async (_tx, { at }) => void seen.push(at.toISOString()) },
    });
    expect(seen).toEqual(['2026-11-20T08:00:00.000Z', NOW.toISOString()]);
  });
});
