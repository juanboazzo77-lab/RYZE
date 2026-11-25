import { describe, expect, it } from 'vitest';
import { fileStore, type FileApi } from './file-store';

/** Sistema de archivos de mentira que puede "cerrarse" después de N operaciones que modifican algo. */
function fakeFiles() {
  const disk = new Map<string, string>();
  let budget = Infinity;
  const spend = (onDie?: () => void) => {
    if (budget <= 0) {
      onDie?.();
      throw new Error('APP_CERRADA');
    }
    budget--;
  };
  const api: FileApi = {
    async read(name) {
      return disk.get(name) ?? null;
    },
    async write(name, data) {
      // Un cierre en medio de la escritura deja el archivo a medias.
      spend(() => disk.set(name, data.slice(0, Math.floor(data.length / 2))));
      disk.set(name, data);
    },
    async remove(name) {
      spend();
      disk.delete(name);
    },
    async rename(from, to) {
      spend();
      const v = disk.get(from);
      if (v === undefined) throw new Error('no existe');
      disk.set(to, v);
      disk.delete(from);
    },
  };
  return { api, disk, dieAfter: (n: number) => (budget = n), revive: () => (budget = Infinity) };
}

describe('fileStore', () => {
  it('guarda, lee, reemplaza y borra', async () => {
    const f = fakeFiles();
    const store = fileStore(f.api);
    expect(await store.get('a')).toBeNull();
    await store.set('a', 'uno');
    await store.set('a', 'dos');
    expect(await store.get('a')).toBe('dos');
    await store.remove('a');
    expect(await store.get('a')).toBeNull();
    expect(f.disk.size).toBe(0);
  });

  it('si la app se cierra en cualquier paso, queda la versión vieja o la nueva, nunca a medias', async () => {
    // Un guardado sobre un archivo existente son 3 pasos: escribir, borrar el viejo y renombrar.
    for (let step = 0; step < 3; step++) {
      const f = fakeFiles();
      const store = fileStore(f.api);
      await store.set('a', 'version-vieja');
      f.dieAfter(step);
      await expect(store.set('a', 'version-nueva')).rejects.toThrow('APP_CERRADA');
      f.revive();
      expect(['version-vieja', 'version-nueva'], `cierre en el paso ${step}`).toContain(await fileStore(f.api).get('a'));
    }
  });

  it('después de un cierre feo, un segundo cierre tampoco pierde lo último completo', async () => {
    const f = fakeFiles();
    const store = fileStore(f.api);
    await store.set('a', 'v1');
    f.dieAfter(2); // escribió v2 entero y borró v1, no llegó a renombrar
    await expect(store.set('a', 'v2')).rejects.toThrow();
    for (let step = 0; step < 4; step++) {
      const copy = fakeFiles();
      for (const [k, v] of f.disk) copy.disk.set(k, v);
      copy.dieAfter(step);
      await fileStore(copy.api).set('a', 'v3').catch(() => undefined);
      copy.revive();
      expect(['v2', 'v3'], `segundo cierre en el paso ${step}`).toContain(await fileStore(copy.api).get('a'));
    }
  });

  it('si el archivo existe y no se puede leer, falla en vez de decir que no hay nada', async () => {
    const f = fakeFiles();
    const store = fileStore({ ...f.api, read: async () => Promise.reject(new Error('bloqueado')) });
    await expect(store.get('a')).rejects.toThrow('bloqueado');
    await expect(store.set('a', 'x')).rejects.toThrow('bloqueado');
    expect(f.disk.size).toBe(0);
  });
});
