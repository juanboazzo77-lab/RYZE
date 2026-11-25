import { describe, expect, it } from 'vitest';
import { AuthError, SyncEngine, uuid, type Reducer, type Transport } from './engine';
import { MAX_BATCH, PROTOCOL_VERSION, operationSchema, type Operation, type OperationResult, type Snapshot } from './protocol';
import { memoryStore, type KeyValueStore } from './store';

const snapshot = (data: Record<string, unknown> = {}): Snapshot => ({
  protocol: PROTOCOL_VERSION,
  takenAt: '2026-11-25T12:00:00.000Z',
  data,
});

/** Servidor de mentira: guarda lo que recibe y se puede "desconectar". */
function fakeServer() {
  const server = {
    online: true,
    sessionValid: true,
    received: [] as Operation[],
    batches: 0,
    data: {} as Record<string, unknown>,
    answer: null as null | ((ops: Operation[]) => OperationResult[]),
    transport: null as unknown as Transport,
  };
  const check = () => {
    if (!server.online) throw new TypeError('Failed to fetch');
    if (!server.sessionValid) throw new AuthError();
  };
  server.transport = {
    async push(ops) {
      check();
      server.batches++;
      const results = server.answer ? server.answer(ops) : ops.map((o) => ({ id: o.id, status: 'applied' as const }));
      const accepted = new Set(results.filter((r) => r.status !== 'rejected').map((r) => r.id));
      server.received.push(...ops.filter((o) => accepted.has(o.id)));
      return { results };
    },
    async pull() {
      check();
      return snapshot(server.data);
    },
  };
  return server;
}

let counter = 0;
const newId = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`;

const make = (store: KeyValueStore, transport: Transport, userId = 'ana') =>
  new SyncEngine({ userId, store, transport, newId });

const payloads = (ops: Operation[]) => ops.map((o) => o.payload);

describe('identificadores', () => {
  it('funcionan aunque el teléfono no tenga crypto.randomUUID, y el servidor los acepta', () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      const ids = new Set(Array.from({ length: 200 }, () => uuid()));
      expect(ids.size).toBe(200);
      for (const id of ids) {
        expect(operationSchema.shape.id.safeParse(id).success).toBe(true);
        expect(id[14]).toBe('4');
      }
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });
});

describe('guardado local', () => {
  it('lo cargado sin conexión sigue ahí después de cerrar y abrir la app', async () => {
    const store = memoryStore();
    const server = fakeServer();
    server.online = false;
    const first = make(store, server.transport);
    await first.enqueue('weight.log', { kg: 80 });
    expect((await first.sync()).status).toBe('offline');

    const reopened = make(store, server.transport);
    await reopened.load();
    expect(payloads(reopened.getState().outbox)).toEqual([{ kg: 80 }]);
  });

  it('varios cambios al mismo tiempo no se pisan', async () => {
    const engine = make(memoryStore(), fakeServer().transport);
    await Promise.all(Array.from({ length: 30 }, (_, i) => engine.enqueue('set.log', { i })));
    expect(engine.getState().outbox).toHaveLength(30);
  });

  it('si el teléfono no puede guardar, avisa con un error y no lo da por guardado', async () => {
    const broken: KeyValueStore = { ...memoryStore(), set: async () => Promise.reject(new Error('disco lleno')) };
    const engine = make(broken, fakeServer().transport);
    await expect(engine.enqueue('weight.log', { kg: 80 })).rejects.toThrow('disco lleno');
    expect(engine.getState().outbox).toHaveLength(0);
  });

  it('un archivo dañado no se pisa: queda una copia', async () => {
    const store = memoryStore({ 'forza.sync.v1.ana': '{"outbox": [roto' });
    const engine = make(store, fakeServer().transport);
    await engine.enqueue('weight.log', { kg: 80 });
    const damaged = Object.entries(store.dump()).filter(([k]) => k.includes('.damaged.'));
    expect(damaged).toHaveLength(1);
    expect(damaged[0]![1]).toBe('{"outbox": [roto');
    expect(engine.getState().outbox).toHaveLength(1);
  });

  it('si un momento no se puede leer, no se da por vacío: se reintenta y no se pisa nada', async () => {
    const real = memoryStore();
    await make(real, fakeServer().transport).enqueue('a', 1);
    let failures = 1;
    const flaky: KeyValueStore = {
      ...real,
      get: async (k) => (failures-- > 0 ? Promise.reject(new Error('bloqueado')) : real.get(k)),
    };
    const engine = make(flaky, fakeServer().transport);
    await expect(engine.enqueue('b', 2)).rejects.toThrow('bloqueado');
    await engine.enqueue('c', 3);
    expect(payloads(engine.getState().outbox)).toEqual([1, 3]);
  });

  it('cada cuenta ve sólo lo suyo', async () => {
    const store = memoryStore();
    const server = fakeServer();
    await make(store, server.transport, 'ana').enqueue('weight.log', { kg: 60 });
    const other = make(store, server.transport, 'bruno');
    await other.load();
    expect(other.getState().outbox).toHaveLength(0);
  });
});

describe('sincronización', () => {
  it('al volver la conexión sube en orden, vacía la cola y baja los datos', async () => {
    const server = fakeServer();
    server.online = false;
    const engine = make(memoryStore(), server.transport);
    await engine.enqueue('workout.start', 1);
    await engine.enqueue('set.log', 2);
    await engine.enqueue('workout.finish', 3);
    await engine.sync();

    server.online = true;
    server.data = { weights: [80] };
    expect(await engine.sync()).toEqual({ status: 'ok', pushed: 3, rejected: 0 });
    expect(payloads(server.received)).toEqual([1, 2, 3]);
    expect(engine.getState().outbox).toHaveLength(0);
    expect(engine.getState().snapshot?.data).toEqual({ weights: [80] });
    expect(engine.getState().lastSyncAt).not.toBeNull();
  });

  it('conserva la hora en que la persona lo hizo, no la hora en que se subió', async () => {
    let clock = new Date('2026-11-25T08:00:00.000Z');
    const server = fakeServer();
    const engine = new SyncEngine({ userId: 'ana', store: memoryStore(), transport: server.transport, newId, now: () => clock });
    await engine.enqueue('workout.finish', {});
    clock = new Date('2026-11-27T20:00:00.000Z');
    await engine.sync();
    expect(server.received[0]!.createdAt).toBe('2026-11-25T08:00:00.000Z');
  });

  it('un reintento que el servidor ya tenía se da por subido', async () => {
    const server = fakeServer();
    server.answer = (ops) => ops.map((o) => ({ id: o.id, status: 'duplicate' }));
    const engine = make(memoryStore(), server.transport);
    await engine.enqueue('weight.log', 1);
    expect((await engine.sync()).status).toBe('ok');
    expect(engine.getState().outbox).toHaveLength(0);
  });

  it('si el servidor confirma sólo una parte, el resto queda y no se adelanta nada', async () => {
    const server = fakeServer();
    server.answer = (ops) => [{ id: ops[0]!.id, status: 'applied' }];
    const engine = make(memoryStore(), server.transport);
    await engine.enqueue('a', 1);
    await engine.enqueue('b', 2);
    await engine.enqueue('c', 3);
    expect(await engine.sync()).toEqual({ status: 'offline', pushed: 1, rejected: 0 });
    expect(payloads(engine.getState().outbox)).toEqual([2, 3]);
    expect(server.batches).toBe(1);
  });

  it('un cambio rechazado no se borra: queda a la vista con el motivo, y los demás suben', async () => {
    const server = fakeServer();
    server.answer = (ops) =>
      ops.map((o) => (o.payload === 2 ? { id: o.id, status: 'rejected', reason: 'INVALID' } : { id: o.id, status: 'applied' }));
    const engine = make(memoryStore(), server.transport);
    await engine.enqueue('a', 1);
    await engine.enqueue('b', 2);
    await engine.enqueue('c', 3);
    expect(await engine.sync()).toEqual({ status: 'ok', pushed: 2, rejected: 1 });
    expect(engine.getState().rejected).toMatchObject([{ payload: 2, reason: 'INVALID' }]);
    expect(engine.getState().outbox).toHaveLength(0);

    await engine.dismissRejected(engine.getState().rejected[0]!.id);
    expect(engine.getState().rejected).toHaveLength(0);
  });

  it('con la sesión vencida no se pierde nada', async () => {
    const server = fakeServer();
    server.sessionValid = false;
    const engine = make(memoryStore(), server.transport);
    await engine.enqueue('a', 1);
    expect((await engine.sync()).status).toBe('auth');
    expect(engine.getState().outbox).toHaveLength(1);
  });

  it('manda en tandas cuando hay muchos cambios', async () => {
    const server = fakeServer();
    const engine = make(memoryStore(), server.transport);
    for (let i = 0; i < MAX_BATCH * 2 + 5; i++) await engine.enqueue('set.log', i);
    await engine.sync();
    expect(server.batches).toBe(3);
    expect(payloads(server.received)).toEqual(Array.from({ length: MAX_BATCH * 2 + 5 }, (_, i) => i));
  });

  it('dos pedidos de sincronizar a la vez no mandan todo dos veces', async () => {
    const server = fakeServer();
    const engine = make(memoryStore(), server.transport);
    await engine.enqueue('a', 1);
    await Promise.all([engine.sync(), engine.sync(), engine.sync()]);
    expect(server.received).toHaveLength(1);
  });

  it('lo que se carga mientras está sincronizando no se pierde', async () => {
    const server = fakeServer();
    const engine = make(memoryStore(), server.transport);
    await engine.enqueue('a', 1);
    const original = server.transport.push.bind(server.transport);
    let added = false;
    server.transport.push = async (ops) => {
      if (!added) {
        added = true;
        await engine.enqueue('b', 2);
      }
      return original(ops);
    };
    await engine.sync();
    expect(payloads(server.received)).toEqual([1, 2]);
    expect(engine.getState().outbox).toHaveLength(0);
  });
});

describe('lo que ve la persona', () => {
  const addWeight: Reducer = (data, op) => {
    const list = (data.weights as Array<{ id: string; kg: number }> | undefined) ?? [];
    const kg = (op.payload as { kg: number }).kg;
    return { ...data, weights: [...list.filter((w) => w.id !== op.id), { id: op.id, kg }] };
  };

  it('muestra lo pendiente encima de lo último que bajó, sin duplicar', async () => {
    const server = fakeServer();
    server.data = { weights: [{ id: 'viejo', kg: 82 }] };
    const engine = make(memoryStore(), server.transport);
    await engine.sync();
    server.online = false;
    const op = await engine.enqueue('weight.log', { kg: 81 });
    expect(engine.view({ 'weight.log': addWeight }).weights).toEqual([
      { id: 'viejo', kg: 82 },
      { id: op.id, kg: 81 },
    ]);
    // Una vez subido, lo que baja del servidor ya lo incluye y no aparece dos veces.
    server.online = true;
    server.data = { weights: [{ id: 'viejo', kg: 82 }, { id: op.id, kg: 81 }] };
    await engine.sync();
    expect(engine.view({ 'weight.log': addWeight }).weights).toHaveLength(2);
  });

  it('mientras quede algo sin confirmar no se pisan los datos con otros que no lo incluyen', async () => {
    const server = fakeServer();
    server.data = { weights: [{ id: 'viejo', kg: 82 }] };
    const engine = make(memoryStore(), server.transport);
    await engine.sync();
    const op = await engine.enqueue('weight.log', { kg: 81 });
    server.answer = () => [];
    server.data = { weights: [] };
    expect((await engine.sync()).status).toBe('offline');
    expect(engine.view({ 'weight.log': addWeight }).weights).toEqual([
      { id: 'viejo', kg: 82 },
      { id: op.id, kg: 81 },
    ]);
  });
});

describe('cerrar sesión', () => {
  it('no borra si queda algo sin subir, salvo que se pida', async () => {
    const store = memoryStore();
    const server = fakeServer();
    server.online = false;
    const engine = make(store, server.transport);
    await engine.enqueue('a', 1);
    expect(await engine.clear()).toBe(false);
    expect(engine.getState().outbox).toHaveLength(1);
    expect(await engine.clear({ discardPending: true })).toBe(true);
    expect(store.dump()).toEqual({});
  });

  it('una descarga que estaba en camino no vuelve a guardar la cuenta que ya salió', async () => {
    const store = memoryStore();
    const server = fakeServer();
    server.data = { secreto: 'de ana' };
    let release!: () => void;
    const original = server.transport.pull.bind(server.transport);
    server.transport.pull = async () => {
      await new Promise<void>((r) => (release = r));
      return original();
    };
    const engine = make(store, server.transport);
    const syncing = engine.sync();
    await new Promise((r) => setTimeout(r, 5));
    expect(await engine.clear()).toBe(true);
    release();
    expect((await syncing).status).toBe('offline');
    expect(store.dump()).toEqual({});
    await expect(engine.enqueue('a', 1)).rejects.toThrow('SESION_CERRADA');
  });

  it('si se anota algo justo antes de cerrar sesión, no se borra sin avisar', async () => {
    const engine = make(memoryStore(), fakeServer().transport);
    await engine.load();
    const saving = engine.enqueue('a', 1);
    const cleared = engine.clear();
    await saving;
    expect(await cleared).toBe(false);
    expect(engine.getState().outbox).toHaveLength(1);
  });
});
