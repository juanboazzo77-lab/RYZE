import { useState } from 'react';
import { AlertTriangle, Check, CloudOff, RefreshCw } from 'lucide-react';
import { getDictionary } from '@/i18n';
import { normalizeLocale } from '@/i18n/config';
import { readAppData, reducers } from '@/lib/sync/data';
import { signOut, type Account } from '../account';
import { Shell, type Tab } from '../shell';
import { useSync, type SyncStatus } from '../use-sync';
import { Button, Card, Screen } from '../ui';
import { Login } from './Login';
import { Train } from './Train';
import { Weight } from './Weight';

const REJECTED: Record<string, string> = {
  INVALID: 'El dato no es válido.',
  FUTURE_DATE: 'La fecha es posterior a hoy.',
  UNKNOWN_TYPE: 'El servidor todavía no sabe recibirlo.',
};

/** Secciones que todavía no están en la app nueva, y en qué etapa llegan. */
const COMING: Partial<Record<Tab, number>> = { nutrition: 2, progress: 3, coach: 4 };

function syncText(status: SyncStatus, pending: number): string {
  if (status === 'syncing') return pending > 0 ? 'Subiendo… lo que cargaste ya está guardado en el teléfono' : 'Sincronizando…';
  if (status === 'auth') return 'La sesión venció';
  if (pending > 0) return `${pending} ${pending === 1 ? 'cambio guardado' : 'cambios guardados'} en el teléfono, sin subir`;
  if (status === 'offline') return 'Sin conexión. Estás viendo lo guardado en el teléfono';
  return 'Todo está subido';
}

export function Main({ account, onSignedOut }: { account: Account; onSignedOut: () => void }) {
  const { engine, state, loaded, loadError, retryLoad, status, syncNow } = useSync(account);
  const [tab, setTab] = useState<Tab>('home');
  const [settings, setSettings] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  /** Cambia al tocar una sección, para volver a su pantalla principal. */
  const [visit, setVisit] = useState(0);

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
  const t = getDictionary(normalizeLocale(data?.profile.locale.toLowerCase()));
  const pending = state.outbox.length;
  const upToDate = pending === 0 && (status === 'ok' || status === 'idle' || status === 'syncing');

  async function leave(discardPending: boolean) {
    if (!(await engine.clear({ discardPending }))) {
      setLeaving(true);
      return;
    }
    await signOut();
    onSignedOut();
  }

  const syncCard = (
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
  );

  const rejected =
    state.rejected.length > 0 ? (
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
    ) : null;

  const waiting = (
    <Card className="text-sm text-muted-foreground">
      {status === 'syncing' || status === 'idle'
        ? 'Bajando tus datos…'
        : 'Todavía no se bajaron tus datos. Conectate a internet una vez y quedan guardados en el teléfono.'}
    </Card>
  );

  return (
    <Shell
      t={t}
      tab={settings ? null : tab}
      onTab={(next) => {
        setSettings(false);
        setTab(next);
        setVisit((v) => v + 1);
        window.scrollTo(0, 0);
      }}
      onSettings={() => setSettings(true)}
      // En el inicio y los ajustes el estado se ve siempre; en el resto, sólo cuando hay algo que saber.
      banner={
        <>
          {settings || tab === 'home' || !upToDate ? syncCard : null}
          {rejected}
        </>
      }
    >
      {settings ? (
        <>
          <h1 className="text-2xl font-bold tracking-tight">{t.nav.settings}</h1>
          <p className="text-sm text-muted-foreground">{account.email} · versión de prueba</p>
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
        </>
      ) : COMING[tab] ? (
        <>
          <h1 className="text-2xl font-bold tracking-tight">{t.nav[tab]}</h1>
          <Card className="text-sm text-muted-foreground">
            Esta sección llega a la app nueva en la etapa {COMING[tab]}. Mientras tanto la tenés en la app del App Store y en la web.
          </Card>
        </>
      ) : !data ? (
        waiting
      ) : tab === 'train' ? (
        <Train key={visit} t={t} data={data} />
      ) : (
        <>
          <p className="text-lg font-bold">Hola{data.profile.name ? `, ${data.profile.name.split(' ')[0]}` : ''}</p>
          <Weight
            data={data}
            pendingDates={new Set(state.outbox.filter((o) => o.type === 'weight.log').map((o) => (o.payload as { date: string }).date))}
            onSave={async (date, weightKg) => {
              await engine.enqueue('weight.log', { date, weightKg });
              void syncNow();
            }}
          />
        </>
      )}
    </Shell>
  );
}
