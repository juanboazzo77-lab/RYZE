import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Check, CloudOff, RefreshCw } from 'lucide-react';
import { getDictionary } from '@/i18n';
import { normalizeLocale } from '@/i18n/config';
import { interpolate } from '@/i18n/interpolate';
import { I18nProvider } from '@/i18n/provider';
import { PREFS_OP, readAppData, reducers } from '@/lib/sync/data';
import { uuid } from '@/lib/sync/engine';
import { FOOD_ADD_OP, FOOD_DELETE_OP, FOOD_UPDATE_OP } from '@/lib/sync/nutrition';
import { ACTIVITY_DELETE_OP, ACTIVITY_LOG_OP, WEIGHT_DELETE_OP } from '@/lib/sync/progress';
import { completedWorkoutSchema, finishDraft, newDraft, WORKOUT_OP, type CompletedWorkout } from '@/lib/sync/workout';
import { accessTokenFor, signOut, type Account } from '../account';
import { setRpcSession } from '../online/rpc';
import { Shell, type Tab } from '../shell';
import { APP_TEXT, deviceLocale, setAppLocale, type AppText } from '../strings';
import { useDraft } from '../use-draft';
import { useSync, type SyncStatus } from '../use-sync';
import { Button, Card, Screen } from '../ui';
import { Login } from './Login';
import { Coach } from './Coach';
import { History } from './History';
import { Nutrition } from './Nutrition';
import { Progress } from './Progress';
import { Ready, Session, Summary } from './Session';
import { Settings } from './Settings';
import { Train } from './Train';
import { Weight } from './Weight';

function rejectedReason(s: AppText, reason: string): string {
  const reasons: Record<string, string> = {
    INVALID: s.rejectedInvalid,
    FUTURE_DATE: s.rejectedFuture,
    UNKNOWN_EXERCISE: s.rejectedExercise,
    CONFLICT: s.rejectedConflict,
  };
  return reasons[reason] ?? s.rejectedOther;
}

/** Qué era lo que no se pudo subir, para que la persona lo pueda reconocer. */
function opLabel(s: AppText, type: string, payload: unknown): string {
  const labels: Record<string, string> = {
    [WORKOUT_OP]: s.opWorkout,
    'weight.log': s.opWeight,
    [WEIGHT_DELETE_OP]: s.opWeightDelete,
    [FOOD_ADD_OP]: s.opFoodAdd,
    [FOOD_UPDATE_OP]: s.opFoodUpdate,
    [FOOD_DELETE_OP]: s.opFoodDelete,
    [ACTIVITY_LOG_OP]: s.opSteps,
    [ACTIVITY_DELETE_OP]: s.opStepsDelete,
    [PREFS_OP]: s.opSettings,
  };
  const template = labels[type];
  if (!template) return '';
  const p = payload as { name?: string; date?: string; weightKg?: number; items?: Array<{ name?: string }> };
  return interpolate(template, {
    name: p.name ?? '',
    date: p.date ?? '?',
    kg: p.weightKg ?? '?',
    names: p.items?.map((i) => i.name).filter(Boolean).join(', ') ?? '',
  });
}

function syncText(s: AppText, status: SyncStatus, pending: number): string {
  if (status === 'syncing') return pending > 0 ? s.uploading : s.syncing;
  if (status === 'auth') return s.sessionExpired;
  if (pending > 0) return pending === 1 ? s.pendingOne : interpolate(s.pendingMany, { n: pending });
  if (status === 'offline') return s.offlineViewing;
  return s.allUploaded;
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
  /** Cambia al tocar la barra de abajo: Progreso vuelve a su pantalla principal. */
  const [progressVisit, setProgressVisit] = useState(0);
  const [settings, setSettings] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const data = loaded ? readAppData(engine.view(reducers)) : null;
  // El idioma de la cuenta; antes de saberlo, el del teléfono.
  const locale = data ? normalizeLocale(data.profile.locale.toLowerCase()) : deviceLocale();
  const s = APP_TEXT[locale];
  const t = getDictionary(locale);
  useEffect(() => {
    if (data) setAppLocale(locale);
    document.documentElement.lang = locale;
  }, [data, locale]);

  // Lo que necesita internet habla con el servidor con la sesión de esta cuenta, y avisa cuando cambió algo allá.
  useEffect(() => {
    setRpcSession(() => accessTokenFor(account.userId));
    const refresh = () => void syncNow();
    window.addEventListener('forza:server-changed', refresh);
    return () => {
      setRpcSession(null);
      window.removeEventListener('forza:server-changed', refresh);
    };
  }, [account.userId, syncNow]);
  const uploadPending = useCallback(async () => {
    await syncNow();
  }, [syncNow]);

  // Si la app se cerró justo después de terminar, el entrenamiento ya está en la cola: el borrador sobra.
  const workoutQueued = drafts.draft
    ? [...state.outbox, ...state.rejected].some((o) => o.type === WORKOUT_OP && (o.payload as { workoutId?: string }).workoutId === drafts.draft!.workoutId)
    : false;
  const clearDraft = drafts.clear;
  useEffect(() => {
    if (workoutQueued) void clearDraft().catch(() => undefined);
  }, [workoutQueued, clearDraft]);

  /** Todo lo de adentro usa los textos de la web en el idioma elegido. */
  const translated = (children: ReactNode) => (
    <I18nProvider locale={locale} t={t}>
      {children}
    </I18nProvider>
  );

  if (renewing) {
    return (
      <Login
        email={account.email}
        notice={s.loginExpired}
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
          <p>{s.readError}</p>
          <Button
            variant="outline"
            onClick={() => {
              retryLoad();
              drafts.retryLoad();
            }}
          >
            {s.tryAgain}
          </Button>
        </Card>
      </Screen>
    );
  }
  if (!loaded || !drafts.ready) return <Screen><p className="text-sm text-muted-foreground">{s.opening}</p></Screen>;

  const pending = state.outbox.length;
  const upToDate = pending === 0 && (status === 'ok' || status === 'idle' || status === 'syncing');

  const active = drafts.draft && !workoutQueued ? drafts.draft : null;

  /** Guarda un cambio en el teléfono y trata de subirlo. */
  const change = async (type: string, payload: unknown) => {
    await engine.enqueue(type, payload);
    void syncNow();
  };

  /** Con un entrenamiento abierto, "empezar" lo retoma: nunca hay dos a la vez. */
  const pickDay = (planDayId: string) => {
    if (active) setSessionOpen(true);
    else setReadyDayId(planDayId);
  };

  if (finished) {
    return translated(<Summary t={t} workout={finished} pending={pending > 0} onClose={() => setFinished(null)} />);
  }

  const readyDay = data?.training?.plan?.days.find((d) => d.id === readyDayId);
  if (readyDay && !active) {
    return translated(
      <Ready
        t={t}
        day={readyDay}
        onBack={() => setReadyDayId(null)}
        onStart={() => {
          void drafts.update(() => newDraft(readyDay, uuid, new Date())).catch(() => undefined);
          setReadyDayId(null);
          setSessionOpen(true);
        }}
      />,
    );
  }

  if (sessionOpen && active) {
    return translated(
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
      />,
    );
  }

  const activeCard = active ? (
    <Card className="flex items-center justify-between gap-3 border-primary/50 bg-accent">
      <div className="min-w-0">
        <p className="truncate font-semibold">{active.name}</p>
        <p className="text-xs text-muted-foreground">
          {t.training.inProgressSince.replace('{time}', new Date(active.startedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }))}
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
        <span className="min-w-0">{syncText(s, status, pending)}</span>
      </p>
      {status === 'auth' ? (
        <Button className="shrink-0" onClick={() => setRenewing(true)}>{s.enter}</Button>
      ) : (
        <button type="button" aria-label={s.syncNow} onClick={() => void syncNow()} disabled={status === 'syncing'} className="shrink-0 rounded-lg border p-2.5 disabled:opacity-50">
          <RefreshCw className={`size-4 ${status === 'syncing' ? 'animate-spin' : ''}`} />
        </button>
      )}
    </Card>
  );

  const rejected =
    state.rejected.length > 0 ? (
      <Card className="space-y-2 border-warning text-sm">
        <p className="font-semibold">{s.rejectedTitle}</p>
        {state.rejected.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-3">
            <p className="min-w-0">
              {[opLabel(s, r.type, r.payload), rejectedReason(s, r.reason)].filter(Boolean).join('. ')}
            </p>
            <Button variant="outline" className="shrink-0" onClick={() => void engine.dismissRejected(r.id)}>{s.understood}</Button>
          </div>
        ))}
      </Card>
    ) : null;

  const waiting = (
    <Card className="text-sm text-muted-foreground">
      {status === 'syncing' || status === 'idle' ? s.downloading : s.notDownloaded}
    </Card>
  );

  return translated(
    <Shell
      t={t}
      tab={settings ? null : tab}
      onTab={(next) => {
        setSettings(false);
        setHistoryOpen(false);
        setProgressVisit((n) => n + 1);
        setTab(next);
        window.scrollTo(0, 0);
      }}
      onSettings={() => {
        setSettings(true);
        setLeaving(false);
        window.scrollTo(0, 0);
      }}
      // En el inicio y los ajustes el estado se ve siempre; en el resto, sólo cuando hay algo que saber.
      banner={
        <>
          {settings || tab === 'home' || !upToDate ? syncCard : null}
          {rejected}
        </>
      }
    >
      {settings ? (
        <Settings
          t={t}
          data={data}
          email={account.email}
          confirmingLogout={leaving}
          onPrefs={(prefs) => change(PREFS_OP, prefs)}
          onLogout={() => void leave(false)}
          onKeep={() => setLeaving(false)}
          onLogoutAnyway={() => void leave(true)}
        />
      ) : tab === 'coach' ? (
        <Coach t={t} beforeLoad={uploadPending} />
      ) : !data ? (
        waiting
      ) : tab === 'nutrition' ? (
        <>
          {activeCard}
          <Nutrition t={t} data={data} outbox={state.outbox} onChange={change} />
        </>
      ) : tab === 'progress' ? (
        <>
          {activeCard}
          <Progress key={progressVisit} t={t} locale={locale} data={data} outbox={state.outbox} onChange={change} />
        </>
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
          <p className="text-lg font-bold">{s.hello}{data.profile.name ? `, ${data.profile.name.split(' ')[0]}` : ''}</p>
          <Weight
            data={data}
            pendingDates={new Set(state.outbox.filter((o) => o.type === 'weight.log').map((o) => (o.payload as { date: string }).date))}
            onSave={(date, weightKg) => change('weight.log', { date, weightKg })}
          />
        </>
      )}
    </Shell>,
  );
}
