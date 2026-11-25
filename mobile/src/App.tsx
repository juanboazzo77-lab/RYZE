import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react';
import { CloudOff, HardDriveDownload, Wifi, WifiOff } from 'lucide-react';
import { SyncEngine, type Transport } from '@/lib/sync/engine';
import { deviceStore } from './platform/device-store';
import { useOnline } from './platform/use-online';

/**
 * Etapa 0: la app abre desde el teléfono y guarda cosas sin internet. Todavía no hay inicio de sesión ni servidor
 * conectado (llegan en los próximos pasos), así que lo que se anota queda pendiente de subir.
 */
const notConnectedYet: Transport = {
  push: () => Promise.reject(new Error('SERVIDOR_NO_CONECTADO')),
  pull: () => Promise.reject(new Error('SERVIDOR_NO_CONECTADO')),
};

const engine = new SyncEngine({ userId: 'prueba-local', store: deviceStore, transport: notConnectedYet });

function useSyncState() {
  return useSyncExternalStore(
    (onChange) => engine.subscribe(onChange),
    () => engine.getState(),
  );
}

export function App() {
  const online = useOnline();
  const state = useSyncState();
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [text, setText] = useState('');
  const [saveError, setSaveError] = useState(false);

  function load() {
    setLoadError(false);
    engine
      .load()
      .then(() => {
        // `load` no avisa a los que escuchan: se fuerza el primer dibujo con lo leído.
        setReady(true);
      })
      .catch(() => setLoadError(true));
  }
  useEffect(load, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    const note = text.trim();
    if (!note) return;
    setSaveError(false);
    try {
      await engine.enqueue('test.note', { note });
      setText('');
    } catch {
      setSaveError(true);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 pb-8 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Forza AI</h1>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${online ? 'bg-primary/15 text-primary' : 'bg-warning/15 text-warning'}`}
        >
          {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
          {online ? 'Con conexión' : 'Sin conexión'}
        </span>
      </header>

      <section className="rounded-2xl border bg-card p-4">
        <p className="flex items-center gap-2 font-semibold">
          <HardDriveDownload className="size-4 text-primary" />
          App instalada en el teléfono
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta pantalla no se descarga de internet. Versión de prueba de la etapa 0: sirve para comprobar que abre sin
          señal y que no pierde lo que anotás.
        </p>
      </section>

      {loadError ? (
        <section className="space-y-2 rounded-2xl border border-warning p-4 text-sm">
          <p>No se pudieron leer los datos guardados. No se borró nada.</p>
          <button type="button" onClick={load} className="rounded-lg border px-3 py-1.5 font-medium">
            Probar de nuevo
          </button>
        </section>
      ) : null}

      <form onSubmit={save} className="space-y-2 rounded-2xl border bg-card p-4">
        <label htmlFor="nota" className="text-sm font-semibold">
          Prueba de guardado
        </label>
        <div className="flex gap-2">
          <input
            id="nota"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            placeholder="Escribí cualquier cosa"
            className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <button type="submit" disabled={!ready || !text.trim()} className="rounded-lg bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">
            Guardar
          </button>
        </div>
        {saveError ? <p className="text-sm text-warning">No se pudo guardar en el teléfono. Probá de nuevo.</p> : null}
        <p className="text-xs text-muted-foreground">Cerrá la app por completo, activá el modo avión y volvé a abrirla: tiene que seguir acá.</p>
      </form>

      {ready ? (
        <section className="rounded-2xl border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CloudOff className="size-4 text-muted-foreground" />
            Guardado en el teléfono, sin subir: {state.outbox.length}
          </p>
          <ul className="mt-2 divide-y">
            {[...state.outbox].reverse().map((op) => (
              <li key={op.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 break-words">{(op.payload as { note?: string }).note}</span>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {new Date(op.createdAt).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </time>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Todavía no se conecta con el servidor: es el próximo paso.</p>
        </section>
      ) : null}
    </div>
  );
}
