import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { fileStore, type FileApi } from '@/lib/sync/file-store';
import type { KeyValueStore } from '@/lib/sync/store';

const FOLDER = 'forza-data';
/** Carpeta privada de la app: no la borra el sistema para liberar espacio (como sí puede pasar con el navegador). */
const DIRECTORY = Directory.Library;

let folderReady: Promise<void> | null = null;
function ensureFolder(): Promise<void> {
  folderReady ??= (async () => {
    try {
      await Filesystem.readdir({ path: FOLDER, directory: DIRECTORY });
    } catch {
      await Filesystem.mkdir({ path: FOLDER, directory: DIRECTORY, recursive: true });
    }
  })().catch((e) => {
    folderReady = null;
    throw e;
  });
  return folderReady;
}

/** Que no exista se averigua mirando la carpeta: un error al leer un archivo que SÍ existe tiene que subir. */
async function exists(name: string): Promise<boolean> {
  await ensureFolder();
  const { files } = await Filesystem.readdir({ path: FOLDER, directory: DIRECTORY });
  return files.some((f) => f.name === name);
}

const capacitorFiles: FileApi = {
  async read(name) {
    if (!(await exists(name))) return null;
    const { data } = await Filesystem.readFile({ path: `${FOLDER}/${name}`, directory: DIRECTORY, encoding: Encoding.UTF8 });
    return typeof data === 'string' ? data : await data.text();
  },
  async write(name, data) {
    await ensureFolder();
    await Filesystem.writeFile({ path: `${FOLDER}/${name}`, directory: DIRECTORY, encoding: Encoding.UTF8, data });
  },
  async remove(name) {
    await Filesystem.deleteFile({ path: `${FOLDER}/${name}`, directory: DIRECTORY });
  },
  async rename(from, to) {
    await Filesystem.rename({ from: `${FOLDER}/${from}`, to: `${FOLDER}/${to}`, directory: DIRECTORY, toDirectory: DIRECTORY });
  },
};

/** En la computadora, mientras se desarrolla, alcanza con el almacenamiento del navegador. */
const browserStore: KeyValueStore = {
  async get(key) {
    return localStorage.getItem(key);
  },
  async set(key, value) {
    localStorage.setItem(key, value);
  },
  async remove(key) {
    localStorage.removeItem(key);
  },
};

export const deviceStore: KeyValueStore = Capacitor.isNativePlatform() ? fileStore(capacitorFiles) : browserStore;
