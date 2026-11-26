import { useEffect, useState } from 'react';
import { AlertTriangle, Check, CloudOff, RefreshCw } from 'lucide-react';
import { getDictionary } from '@/i18n';
import { normalizeLocale } from '@/i18n/config';
import { I18nProvider } from '@/i18n/provider';
import { readAppData, reducers } from '@/lib/sync/data';
import { uuid } from '@/lib/sync/engine';
import { FOOD_ADD_OP, FOOD_DELETE_OP, FOOD_UPDATE_OP } from '@/lib/sync/nutrition';
import { completedWorkoutSchema, finishDraft, newDraft, WORKOUT_OP, type CompletedWorkout } from '@/lib/sync/workout';
import { signOut, type Account } from '../account';
import { Shell, type Tab } from '../shell';
import { useDraft } from '../use-draft';
import { useSync, type SyncStatus } from '../use-sync';
import { Button, Card, Screen } from '../ui';
import { Login } from './Login';
import { History } from './History';
import { Nutrition } from './Nutrition';
import { Ready, Session, Summary } from './Session';
import { Train } from './Train';
import { Weight } from './Weight';

const REJECTED: Record<string, string> = {
  INVALID: 'El dato no es válido.',
  FUTURE_DATE: 'La fecha es posterior a hoy.',
  UNKNOWN_EXERCISE: 'Un ejercicio ya no existe en el servidor.',
  CONFLICT: 'Choca con algo que ya estaba guardado.',
};

/** Secciones que todavía no están en la app nueva, y en qué etapa llegan. */
const COMING: Partial<Record<Tab, number>> = { progress: 3, coach: 4 };

const FOOD_OPS: Record<string, string> = {
  [FOOD_ADD_OP]: 'Comida anotada',
  [FOOD_UPDATE_OP]: 'Cambio en una comida',
  [FOOD_DELETE_OP]: 'Comida eliminada',
};

/** Qué era lo que no se pudo subir, para que la persona lo pueda reconocer. */
function foodLabel(type: string, payload: unknown): string {
  if (!FOOD_OPS[type]) return '';
  const p = payload as { date?: string; items?: Array<{ name?: string }> };
  const names = p.items?.map((i) => i.name).filter(Boolean).join(', ');
  return `${FOOD_OPS[type]}${p.date ? ` del ${p.date}` : ''}${names ? `: ${names}` : ''}. `;
}

function syncText(status: SyncStatus, pending: number): string {
  if (status === 'syncing') return pending > 0 ? 'Subiendo… lo que cargaste ya está guardado en el teléfono' : 'Sincronizando…';
  if (status === 'auth') return 'La sesión venció';
  if (pending > 0) return `${pending} ${pending === 1 ? 'cambio guardado' : 'cambios guardados'} en el teléfono, sin subir`;
  if (status === 'offline') return 'Sin conexión. Estás viendo lo guardado en el teléfono';
  return 'Todo está subido';
}

export function Main({ account, onSignedOut }: { account: Account; onSignedOut: () => void }) {
  const { engine, state, loaded, loadError, retryLoad, status, syncNow } = useSync(account);
  const drafts = useDraft(account.userId);
  const [tab, setTab] = useState<Tab>('home');
  /** El día elegido, antes de arrancar. */
  const [readyDayId, setReadyDayId] = useState<string | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [finished, setFinished] = useState<CompletedWorkout | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Si la app se cerró justo después de terminar, el entrenamiento ya está en la cola: el borrador sobra.
  const workoutQueued = drafts.draft
    ? [...state.outbox, ...state.rejected].some((o) => o.type === WORKOUT_OP && (o.payload as { workoutId?: string }).workoutId === drafts.draft!.workoutId)
    : false;
  const clearDraft = drafts.clear;
  useEffect(() => {
    if (workoutQueued) void clearDraft().catch(() => undefined);
  }, [workoutQueued, clearDraft]);

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

  if (loadError || drafts.loadError) {
    return (
      <Screen>
        <Card className="space-y-2 border-warning text-sm">
          <p>No se pudieron leer los datos guardados. No se borró nada.</p>
          <Button
            variant="outline"
            onClick={() => {
              retryLoad();
              drafts.retryLoad();
            }}
          >
            Probar de nuevo
          </Button>
        </Card>
      </Screen>
    );
  }
  if (!loaded || !drafts.ready) return <Screen><p className="text-sm text-muted-foreground">Abriendo…</p></Screen>;

  const data = readAppData(engine.view(reducers));
  const t = getDictionary(normalizeLocale(data?.profile.locale.toLowerCase()));
  const pending = state.outbox.length;
  const upToDate = pending === 0 && (status === 'ok' || status === 'idle' || status === 'syncing');

  const active = drafts.draft && !workoutQueued ? drafts.draft : null;

  /** Con un entrenamiento abierto, "empezar" lo retoma: nunca hay dos a la vez. */
  const pickDay = (planDayId: string) => {
    if (active) setSessionOpen(true);
    else setReadyDayId(planDayId);
  };

  if (finished) {
    return <Summary t={t} workout={finished} pending={pending > 0} onClose={() => setFinished(null)} />;
  }

  const readyDay = data?.training?.plan?.days.find((d) => d.id === readyDayId);
  if (readyDay && !active) {
    return (
      <Ready
        t={t}
        day={readyDay}
        onBack={() => setReadyDayId(null)}
        onStart={() => {
          void drafts.update(() => newDraft(readyDay, uuid, new Date())).catch(() => undefined);
          setReadyDayId(null);
          setSessionOpen(true);
        }}
      />
    );
  }

  if (sessionOpen && active) {
    return (
      <I18nProvider locale={normalizeLocale(data?.profile.locale.toLowerCase())} t={t}>
        <Session
          t={t}
          draft={active}
          history={data?.training?.history}
          saveError={drafts.saveError}
          update={drafts.update}
          onMinimize={() => setSessionOpen(false)}
          onDiscard={() => {
            void drafts.clear().catch(() => undefined);
            setSessionOpen(false);
          }}
          onFinish={async (effort) => {
            const workout = completedWorkoutSchema.parse(finishDraft(active, effort, new Date()));
            // Primero queda en la cola de subida; recién después se suelta el borrador.
            await engine.enqueue(WORKOUT_OP, workout);
            setSessionOpen(false);
            setFinished(workout);
            await drafts.clear().catch(() => undefined);
            void syncNow();
          }}
        />
      </I18nProvider>
    );
  }

  const activeCard = active ? (
    <Card className="flex items-center justify-between gap-3 border-primary/50 bg-accent">
      <div className="min-w-0">
        <p className="truncate font-semibold">{active.name}</p>
        <p className="text-xs text-muted-foreground">
          {t.training.inProgressSince.replace('{time}', new Date(active.startedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }))}
        </p>
      </div>
      <Button className="shrink-0" onClick={() => setSessionOpen(true)}>{t.training.resume}</Button>
    </Card>
  ) : null;

  async function leave(discardPending: boolean) {
    if (drafts.draft && !discardPending) {
      setLeaving(true);
      return;
    }
    if (!(await engine.clear({ discardPending }))) {
      setLeaving(true);
      return;
    }
    await drafts.clear();
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
              {r.type === WORKOUT_OP ? `Entrenamiento "${(r.payload as { name?: string }).name ?? ''}". ` : ''}
              {r.type === 'weight.log' ? `Peso del ${(r.payload as { date?: string }).date ?? '?'}: ${(r.payload as { weightKg?: number }).weightKg ?? '?'} kg. ` : ''}
              {foodLabel(r.type, r.payload)}
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
        setHistoryOpen(false);
        setTab(next);
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
              <p>Hay cambios sin subir o un entrenamiento en curso. Si cerrás sesión ahora, <strong>se pierden</strong>.</p>
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
      ) : tab === 'nutrition' ? (
        <I18nProvider locale={normalizeLocale(data.profile.locale.toLowerCase())} t={t}>
          {activeCard}
          <Nutrition
            t={t}
            data={data}
            outbox={state.outbox}
            onChange={async (type, payload) => {
              await engine.enqueue(type, payload);
              void syncNow();
            }}
          />
        </I18nProvider>
      ) : tab === 'train' ? (
        historyOpen ? (
          <History
            t={t}
            data={data}
            pendingIds={new Set(state.outbox.filter((o) => o.type === WORKOUT_OP).map((o) => (o.payload as { workoutId: string }).workoutId))}
            onBack={() => setHistoryOpen(false)}
          />
        ) : (
          <>
            {activeCard}
            <Train t={t} data={data} hasActive={Boolean(active)} onPick={pickDay} onHistory={() => setHistoryOpen(true)} />
          </>
        )
      ) : (
        <>
          {activeCard}
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
