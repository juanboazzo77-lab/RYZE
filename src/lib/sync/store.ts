/**
 * Dónde se guardan las cosas en el teléfono. Es una interfaz mínima para poder cambiar el almacenamiento (archivos del
 * teléfono en la app, memoria en las pruebas, el navegador al desarrollar) sin tocar la sincronización.
 */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { dump(): Record<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    async get(key) {
      return map.get(key) ?? null;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async remove(key) {
      map.delete(key);
    },
    dump: () => Object.fromEntries(map),
  };
}
