import { MAX_BATCH, PROTOCOL_VERSION, type Operation, type PushResponse, type Snapshot } from './protocol';
import type { KeyValueStore } from './store';

/**
 * Guardado local y sincronización. La regla principal: **lo que la persona cargó no se pierde nunca**.
 *
 * - Cada cambio se guarda en el teléfono ANTES de intentar subirlo.
 * - Sólo sale de la cola cuando el servidor confirma ese cambio puntual.
 * - Si el servidor lo rechaza para siempre, no se borra: pasa a una lista de "no se pudo subir" que la app muestra.
 * - Cada cuenta guarda lo suyo por separado.
 */

export interface Transport {
  push(operations: Operation[]): Promise<PushResponse>;
  pull(): Promise<Snapshot>;
}

/** La sesión venció: hay que volver a iniciar sesión. Los cambios quedan guardados. */
export class AuthError extends Error {
  constructor() {
    super('AUTH');
    this.name = 'AuthError';
  }
}

export interface QueuedOperation extends Operation {
  attempts: number;
}

export interface RejectedOperation extends Operation {
  reason: string;
}

export interface SyncState {
  snapshot: Snapshot | null;
  outbox: QueuedOperation[];
  rejected: RejectedOperation[];
  lastSyncAt: string | null;
}

export type SyncOutcome =
  | { status: 'ok'; pushed: number; rejected: number }
  /** No hubo conexión o el servidor falló: se reintenta después. */
  | { status: 'offline'; pushed: number; rejected: number }
  | { status: 'auth'; pushed: number; rejected: number };

/** Aplica sobre los datos un cambio que todavía no se subió, para que la pantalla ya lo muestre. Tiene que poder
 * aplicarse dos veces sin duplicar nada (si el servidor lo recibió pero la respuesta se perdió). */
export type Reducer = (data: Record<string, unknown>, op: Operation) => Record<string, unknown>;

const emptyState = (): SyncState => ({ snapshot: null, outbox: [], rejected: [], lastSyncAt: null });

const keyOf = (userId: string) => `forza.sync.v1.${userId}`;

/** UUID v4. `crypto.randomUUID` no existe en todos los contextos de una app; `getRandomValues` sí. */
export function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (n) => n.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export interface EngineOptions {
  userId: string;
  store: KeyValueStore;
  transport: Transport;
  newId?: () => string;
  now?: () => Date;
}

export class SyncEngine {
  private state: SyncState = emptyState();
  private loaded: Promise<void> | null = null;
  /** Las escrituras van en fila: dos cambios a la vez no se pisan. */
  private writes: Promise<unknown> = Promise.resolve();
  private running: Promise<SyncOutcome> | null = null;
  private listeners = new Set<(state: SyncState) => void>();
  private readonly newId: () => string;
  private readonly now: () => Date;

  constructor(private readonly options: EngineOptions) {
    if (!options.userId) throw new Error('SyncEngine necesita un userId');
    this.newId = options.newId ?? uuid;
    this.now = options.now ?? (() => new Date());
  }

  load(): Promise<void> {
    // Si leer falla (archivo bloqueado por un momento), no se da por vacío: se vuelve a intentar la próxima vez.
    this.loaded ??= this.read().catch((e) => {
      this.loaded = null;
      throw e;
    });
    return this.loaded;
  }

  private async read(): Promise<void> {
    const key = keyOf(this.options.userId);
    const raw = await this.options.store.get(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<SyncState>;
      if (!Array.isArray(parsed.outbox) || !Array.isArray(parsed.rejected)) throw new Error('forma inesperada');
      this.state = { ...emptyState(), ...parsed } as SyncState;
    } catch {
      // Un archivo dañado no se pisa: se aparta una copia (puede tener cambios sin subir) y se arranca vacío.
      await this.options.store.set(`${key}.damaged.${this.now().getTime()}`, raw);
      this.state = emptyState();
    }
  }

  getState(): SyncState {
    return this.state;
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Cambia el estado y lo guarda. Si no se puede guardar, el estado en memoria no cambia y el error sube. */
  private commit(change: (state: SyncState) => SyncState): Promise<void> {
    const run = async () => {
      const next = change(this.state);
      await this.options.store.set(keyOf(this.options.userId), JSON.stringify(next));
      this.state = next;
      for (const listener of this.listeners) listener(next);
    };
    const result = this.writes.then(run, run);
    this.writes = result.catch(() => undefined);
    return result;
  }

  /** Registra algo que hizo la persona. Cuando esta promesa termina, ya está guardado en el teléfono. */
  async enqueue(type: string, payload: unknown): Promise<Operation> {
    await this.load();
    const op: Operation = { id: this.newId(), type, payload, createdAt: this.now().toISOString() };
    await this.commit((s) => ({ ...s, outbox: [...s.outbox, { ...op, attempts: 0 }] }));
    return op;
  }

  /** Descarta un cambio rechazado, cuando la persona ya lo vio. */
  async dismissRejected(id: string): Promise<void> {
    await this.load();
    await this.commit((s) => ({ ...s, rejected: s.rejected.filter((r) => r.id !== id) }));
  }

  /** Sube lo pendiente y baja los datos nuevos. Si ya hay una sincronización en curso, devuelve esa misma. */
  sync(): Promise<SyncOutcome> {
    this.running ??= this.runSync().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async runSync(): Promise<SyncOutcome> {
    let pushed = 0;
    let rejected = 0;
    try {
      await this.load();
      while (this.state.outbox.length > 0) {
        const batch = this.state.outbox.slice(0, MAX_BATCH);
        const ids = new Set(batch.map((o) => o.id));
        await this.commit((s) => ({
          ...s,
          outbox: s.outbox.map((o) => (ids.has(o.id) ? { ...o, attempts: o.attempts + 1 } : o)),
        }));
        const res = await this.options.transport.push(
          batch.map(({ id, type, payload, createdAt }) => ({ id, type, payload, createdAt })),
        );
        const byId = new Map(res.results.filter((r) => ids.has(r.id)).map((r) => [r.id, r]));
        const refused: RejectedOperation[] = [];
        for (const { id, type, payload, createdAt } of batch) {
          const r = byId.get(id);
          if (r?.status === 'rejected') refused.push({ id, type, payload, createdAt, reason: r.reason });
        }
        await this.commit((s) => ({
          ...s,
          outbox: s.outbox.filter((o) => !byId.has(o.id)),
          rejected: [...s.rejected, ...refused],
        }));
        pushed += byId.size - refused.length;
        rejected += refused.length;
        // El servidor no confirmó todo: cortar acá y reintentar después, sin adelantar cambios posteriores.
        if (byId.size < batch.length) return { status: 'offline', pushed, rejected };
      }

      const snapshot = await this.options.transport.pull();
      if (snapshot.protocol !== PROTOCOL_VERSION) return { status: 'offline', pushed, rejected };
      await this.commit((s) => ({ ...s, snapshot, lastSyncAt: this.now().toISOString() }));
      return { status: 'ok', pushed, rejected };
    } catch (e) {
      return { status: e instanceof AuthError ? 'auth' : 'offline', pushed, rejected };
    }
  }

  /** Los datos como los ve la persona: lo último que bajó del servidor más lo que todavía no se subió. */
  view(reducers: Record<string, Reducer>): Record<string, unknown> {
    let data = this.state.snapshot?.data ?? {};
    for (const op of this.state.outbox) {
      const reduce = reducers[op.type];
      if (reduce) data = reduce(data, op);
    }
    return data;
  }

  /** Para cerrar sesión: se niega a borrar si queda algo sin subir, salvo que se pida expresamente. */
  async clear({ discardPending = false }: { discardPending?: boolean } = {}): Promise<boolean> {
    await this.load();
    await this.writes;
    if (!discardPending && this.state.outbox.length > 0) return false;
    await this.options.store.remove(keyOf(this.options.userId));
    this.state = emptyState();
    for (const listener of this.listeners) listener(this.state);
    return true;
  }
}
