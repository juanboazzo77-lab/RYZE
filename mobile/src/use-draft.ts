import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { DraftStore } from '@/lib/sync/draft-store';
import type { Draft } from '@/lib/sync/workout';
import { deviceStore } from './platform/device-store';

/** El entrenamiento en curso de una cuenta, guardado en el teléfono. */
export function useDraft(userId: string) {
  const store = useMemo(() => new DraftStore(userId, deviceStore), [userId]);
  const draft = useSyncExternalStore(
    useCallback((onChange: () => void) => store.subscribe(onChange), [store]),
    () => store.get(),
  );
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  /** Si el último cambio no se pudo guardar: se avisa, porque cerrar la app lo perdería. */
  const [saveError, setSaveError] = useState(false);

  const load = useCallback(() => {
    setLoadError(false);
    store
      .load()
      .then(() => setReady(true))
      .catch(() => setLoadError(true));
  }, [store]);
  useEffect(load, [load]);

  const update = useCallback(
    (change: (draft: Draft | null) => Draft | null) =>
      store.update(change).then(
        () => setSaveError(false),
        (e) => {
          setSaveError(true);
          throw e;
        },
      ),
    [store],
  );

  return { draft, ready, loadError, retryLoad: load, saveError, update, clear: () => store.clear() };
}
