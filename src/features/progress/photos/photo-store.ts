/**
 * Fotos de progreso: se guardan SÓLO en este dispositivo (IndexedDB del navegador/app). No se
 * suben a ningún servidor; es lo que se le promete a la persona. Entran sólo desde la revisión
 * semanal (las mismas fotos que se mandan a la IA para el análisis, que el servidor descarta). Por eso
 * se pierden si desinstala la app o cambia de teléfono, y la pantalla se lo avisa.
 */

export type Pose = 'front' | 'side' | 'back';
export const POSES: Pose[] = ['front', 'side', 'back'];

export interface ProgressPhoto {
  id: string;
  /** Día de la foto (YYYY-MM-DD), elegido por la persona. */
  date: string;
  /** Las fotos viejas traen pose; las de la revisión semanal no. */
  pose?: Pose;
  /** JPEG ya reducido, como data URL. */
  dataUrl: string;
  createdAt: number;
}

const DB_NAME = 'forza-progress-photos';
const STORE = 'photos';

export function photoStorageAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('no se pudo abrir el almacenamiento'));
  });
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = work(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error('falló el almacenamiento'));
        };
      }),
  );
}

/** Todas las fotos, de la más vieja a la más nueva. */
export async function listPhotos(): Promise<ProgressPhoto[]> {
  const all = await run<ProgressPhoto[]>('readonly', (s) => s.getAll());
  return all.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
}

export async function addPhoto(input: Pick<ProgressPhoto, 'date' | 'dataUrl'> & { pose?: Pose }): Promise<ProgressPhoto> {
  const photo: ProgressPhoto = { id: crypto.randomUUID(), createdAt: Date.now(), ...input };
  await run('readwrite', (s) => s.put(photo));
  // Pide que el sistema no borre el almacenamiento si hay poco espacio (mejor esfuerzo).
  try {
    await navigator.storage?.persist?.();
  } catch {
    // ignorar
  }
  return photo;
}

export async function deletePhoto(id: string): Promise<void> {
  await run('readwrite', (s) => s.delete(id));
}
