import { useState, type FormEvent } from 'react';
import { AlertTriangle, Check, CloudOff, RefreshCw } from 'lucide-react';
import { parseDecimal, readAppData, reducers, type AppData } from '@/lib/sync/data';
import { localTodayISO } from '@/lib/date';
import { displayWeight, inputWeightToKg, weightUnitLabel } from '@/lib/units';
import { signOut, type Account } from '../account';
import { useSync, type SyncStatus } from '../use-sync';
import { Button, Card, Input, Screen } from '../ui';
import { Login } from './Login';

const SHOWN_WEIGHTS = 10;

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });

const REJECTED: Record<string, string> = {
  INVALID: 'El dato no es válido.',
  FUTURE_DATE: 'La fecha es posterior a hoy.',
  UNKNOWN_TYPE: 'El servidor todavía no sabe recibirlo.',
};

function syncText(status: SyncStatus, pending: number): string {
  if (status === 'syncing') return pending > 0 ? 'Subiendo… lo que cargaste ya está guardado en el teléfono' : 'Sincronizando…';
  if (status === 'auth') return 'La sesión venció';
  if (pending > 0) return `${pending} ${pending === 1 ? 'cambio guardado' : 'cambios guardados'} en el teléfono, sin subir`;
  if (status === 'offline') return 'Sin conexión con el servidor. Estás viendo lo guardado en el teléfono';
  return 'Todo está subido';
}

export function Home({ account, onSignedOut }: { account: Account; onSignedOut: () => void }) {
  const { engine, state, loaded, loadError, retryLoad, status, syncNow } = useSync(account);
  const [renewing, setRenewing] = useState(false);
  const [leaving, setLeaving] = useState(false);

  if (renewing) {
    return (
      <Login
        email={account.email}
        notice="Tu sesión venció. Entrá de nuevo para subir lo que está guardado. No se borra nada."
        onCancel={() => setRenewing(false)}
        onSignedIn={() => {
          setRenewing(false);
          void syncNow();
        }}
      />
    );
  }

  if (loadError) {
    return (
      <Screen>
        <Card className="space-y-2 border-warning text-sm">
          <p>No se pudieron leer los datos guardados. No se borró nada.</p>
          <Button variant="outline" onClick={retryLoad}>Probar de nuevo</Button>
        </Card>
      </Screen>
    );
  }
  if (!loaded) return <Screen><p className="text-sm text-muted-foreground">Abriendo…</p></Screen>;

  const data = readAppData(engine.view(reducers));
  const pending = state.outbox.length;

  async function leave(discardPending: boolean) {
    if (!(await engine.clear({ discardPending }))) {
      setLeaving(true);
      return;
    }
    await signOut();
    onSignedOut();
  }

  return (
    <Screen>
      <Card className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-sm" role="status">
          {status === 'auth' ? <AlertTriangle className="size-4 shrink-0 text-warning" /> : pending > 0 || status === 'offline' ? <CloudOff className="size-4 shrink-0 text-muted-foreground" /> : <Check className="size-4 shrink-0 text-primary" />}
          <span className="min-w-0">{syncText(status, pending)}</span>
        </p>
        {status === 'auth' ? (
          <Button className="shrink-0" onClick={() => setRenewing(true)}>Entrar</Button>
        ) : (
          <button type="button" aria-label="Sincronizar ahora" onClick={() => void syncNow()} disabled={status === 'syncing'} className="shrink-0 rounded-lg border p-2.5 disabled:opacity-50">
            <RefreshCw className={`size-4 ${status === 'syncing' ? 'animate-spin' : ''}`} />
          </button>
        )}
      </Card>

      {state.rejected.length > 0 ? (
        <Card className="space-y-2 border-warning text-sm">
          <p className="font-semibold">No se pudo subir</p>
          {state.rejected.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3">
              <p className="min-w-0">
                {r.type === 'weight.log' ? `Peso del ${(r.payload as { date?: string }).date ?? '?'}: ${(r.payload as { weightKg?: number }).weightKg ?? '?'} kg. ` : ''}
                {REJECTED[r.reason] ?? 'El servidor lo rechazó.'}
              </p>
              <Button variant="outline" className="shrink-0" onClick={() => void engine.dismissRejected(r.id)}>Entendido</Button>
            </div>
          ))}
        </Card>
      ) : null}

      {data ? (
        <>
          <p className="text-lg font-bold">Hola{data.profile.name ? `, ${data.profile.name.split(' ')[0]}` : ''}</p>
          <Weight data={data} pendingDates={new Set(state.outbox.filter((o) => o.type === 'weight.log').map((o) => (o.payload as { date: string }).date))} onSave={async (date, weightKg) => {
            await engine.enqueue('weight.log', { date, weightKg });
            void syncNow();
          }} />
        </>
      ) : (
        <Card className="text-sm text-muted-foreground">
          {status === 'syncing' || status === 'idle'
            ? 'Bajando tus datos…'
            : 'Todavía no se bajaron tus datos. Conectate a internet una vez y quedan guardados en el teléfono.'}
        </Card>
      )}

      <div className="mt-auto space-y-2 pt-4">
        <p className="text-center text-xs text-muted-foreground">{account.email} · versión de prueba</p>
        {leaving ? (
          <Card className="space-y-3 border-warning text-sm">
            <p>Hay cambios sin subir. Si cerrás sesión ahora, <strong>se pierden</strong>.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setLeaving(false)}>No cerrar</Button>
              <Button variant="outline" className="text-warning" onClick={() => void leave(true)}>Cerrar y perderlos</Button>
            </div>
          </Card>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => void leave(false)}>Cerrar sesión</Button>
        )}
      </div>
    </Screen>
  );
}

function Weight({ data, pendingDates, onSave }: { data: AppData; pendingDates: Set<string>; onSave: (date: string, weightKg: number) => Promise<void> }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const system = data.profile.unitSystem;
  const unit = weightUnitLabel(system);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = parseDecimal(text);
    const kg = value === null ? null : Math.round(inputWeightToKg(value, system) * 100) / 100;
    if (kg === null || kg < 20 || kg > 500) {
      setError('Escribí un peso válido.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSave(localTodayISO(data.profile.timezone), kg);
      setText('');
    } catch {
      setError('No se pudo guardar en el teléfono. Probá de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <form onSubmit={submit} className="space-y-2">
        <label htmlFor="peso" className="text-sm font-semibold">Tu peso de hoy ({unit})</label>
        <div className="flex gap-2">
          <Input id="peso" inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} placeholder={unit === 'kg' ? '78,4' : '172,8'} className="flex-1" />
          <Button type="submit" disabled={busy || !text.trim()}>Guardar</Button>
        </div>
        {error ? <p role="alert" className="text-sm text-warning">{error}</p> : null}
      </form>
      {data.weights.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no cargaste ningún peso.</p>
      ) : (
        <ul className="divide-y">
          {data.weights.slice(0, SHOWN_WEIGHTS).map((w) => (
            <li key={w.date} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-muted-foreground">{shortDate(w.date)}</span>
              <span className="flex items-center gap-2 font-semibold tabular-nums">
                {pendingDates.has(w.date) ? <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">sin subir</span> : null}
                {displayWeight(w.weightKg, system).value.toLocaleString('es-AR')} {unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
