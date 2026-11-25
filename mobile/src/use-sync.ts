import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { SyncEngine, type SyncOutcome } from '@/lib/sync/engine';
import { httpTransport } from '@/lib/sync/http-transport';
import { accessTokenFor, type Account } from './account';
import { deviceStore } from './platform/device-store';

/** Cada cuánto se reintenta mientras quede algo sin subir. */
const RETRY_MS = 60_000;

export type SyncStatus = 'idle' | 'syncing' | SyncOutcome['status'];

/** Los datos guardados de una cuenta y su sincronización: se intenta sola al abrir, al volver la señal y al volver a la app. */
export function useSync(account: Account) {
  const engine = useMemo(
    () =>
      new SyncEngine({
        userId: account.userId,
        store: deviceStore,
        transport: httpTransport({ baseUrl: __API_URL__, getToken: () => accessTokenFor(account.userId) }),
      }),
    [account.userId],
  );

  const state = useSyncExternalStore(
    useCallback((onChange: () => void) => engine.subscribe(onChange), [engine]),
    () => engine.getState(),
  );
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [status, setStatus] = useState<SyncStatus>('idle');

  const syncNow = useCallback(async () => {
    // Sin señal ni se intenta: con la sesión vencida el intento tarda en rendirse y parecería que está haciendo algo.
    // Cuando vuelve la señal se dispara solo.
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }
    setStatus('syncing');
    const result = await engine.sync();
    // Si mientras subía se anotó algo más, se sube en la vuelta siguiente.
    const again = result.status === 'ok' && engine.getState().outbox.length > 0;
    setStatus(again ? (await engine.sync()).status : result.status);
  }, [engine]);

  const load = useCallback(() => {
    setLoadError(false);
    engine
      .load()
      .then(() => {
        setLoaded(true);
        void syncNow();
      })
      .catch(() => setLoadError(true));
  }, [engine, syncNow]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!loaded) return;
    const again = () => void syncNow();
    const onVisible = () => {
      if (document.visibilityState === 'visible') again();
    };
    window.addEventListener('online', again);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => {
      if (engine.getState().outbox.length > 0) again();
    }, RETRY_MS);
    return () => {
      window.removeEventListener('online', again);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [engine, loaded, syncNow]);

  return { engine, state, loaded, loadError, retryLoad: load, status, syncNow };
}
