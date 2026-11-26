import type { KeyValueStore } from './store';
import { draftSchema, type Draft } from './workout';

/**
 * El entrenamiento en curso, guardado en el teléfono con cada cambio. Si la app se cierra a mitad (o el teléfono se
 * queda sin batería), al abrirla sigue donde estaba.
 */
const keyOf = (userId: string) => `forza.draft.v1.${userId}`;

export class DraftStore {
  private draft: Draft | null = null;
  private loaded: Promise<void> | null = null;
  private writes: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();

  constructor(
    private readonly userId: string,
    private readonly store: KeyValueStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  load(): Promise<void> {
    this.loaded ??= this.read().catch((e) => {
      this.loaded = null;
      throw e;
    });
    return this.loaded;
  }

  private async read() {
    const raw = await this.store.get(keyOf(this.userId));
    if (!raw) return;
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      /* se trata como dañado */
    }
    const ok = draftSchema.safeParse(parsed);
    if (ok.success) this.draft = ok.data;
    // Un borrador que no se entiende no se pisa: se aparta una copia.
    else await this.store.set(`${keyOf(this.userId)}.damaged.${this.now().getTime()}`, raw);
    this.emit();
  }

  get(): Draft | null {
    return this.draft;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    for (const l of this.listeners) l();
  }

  /**
   * Cambia el entrenamiento. La pantalla lo ve enseguida (se escribe mientras se entrena) y el guardado va en fila
   * detrás; la promesa termina cuando quedó en el teléfono, y falla si no se pudo guardar.
   */
  update(change: (draft: Draft | null) => Draft | null): Promise<void> {
    const next = change(this.draft);
    if (next === this.draft) return Promise.resolve();
    this.draft = next;
    this.emit();
    const run = () =>
      next ? this.store.set(keyOf(this.userId), JSON.stringify(next)) : this.store.remove(keyOf(this.userId));
    const result = this.writes.then(run, run);
    this.writes = result.catch(() => undefined);
    return result;
  }

  clear(): Promise<void> {
    return this.update(() => null);
  }
}
