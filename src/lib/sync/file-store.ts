import type { KeyValueStore } from './store';

/** Lo mínimo que hace falta del sistema de archivos del teléfono. */
export interface FileApi {
  /** Devuelve null SÓLO si el archivo no existe. Si existe y no se puede leer, tiene que fallar: devolver null haría
   * creer que no había nada y el próximo guardado lo pisaría. */
  read(name: string): Promise<string | null>;
  write(name: string, data: string): Promise<void>;
  remove(name: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
}

const fileName = (key: string) => `${key.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`;

/**
 * Guarda cada cosa en un archivo del teléfono sin dejarlo nunca a medias: primero escribe entero un archivo aparte y
 * recién después reemplaza al anterior. Si la app se cierra en cualquier momento, queda la versión vieja o la nueva.
 */
export function fileStore(files: FileApi): KeyValueStore {
  /** Una cosa por vez sobre cada archivo: un guardado tiene varios pasos y no puede mezclarse con otro ni con una lectura. */
  const queues = new Map<string, Promise<unknown>>();
  function inTurn<T>(name: string, task: () => Promise<T>): Promise<T> {
    const result = (queues.get(name) ?? Promise.resolve()).then(task, task);
    queues.set(
      name,
      result.catch(() => undefined),
    );
    return result;
  }

  return {
    get(key) {
      const name = fileName(key);
      // Si falta el principal, es que el cierre fue entre borrar el viejo y renombrar el nuevo (que ya estaba entero).
      return inTurn(name, async () => (await files.read(name)) ?? (await files.read(`${name}.new`)));
    },
    set(key, value) {
      const name = fileName(key);
      const next = `${name}.new`;
      return inTurn(name, async () => {
        // Si lo único que hay es el ".new" de un cierre anterior, primero se asienta: es la última versión completa.
        if ((await files.read(name)) === null && (await files.read(next)) !== null) await files.rename(next, name);
        await files.write(next, value);
        if ((await files.read(name)) !== null) await files.remove(name);
        await files.rename(next, name);
      });
    },
    remove(key) {
      const name = fileName(key);
      return inTurn(name, async () => {
        for (const n of [`${name}.new`, name]) {
          if ((await files.read(n)) !== null) await files.remove(n);
        }
      });
    },
  };
}
