import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, Dumbbell, MoreHorizontal, Plus, Timer, Trash2, Trophy, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { primeRestAudio, RestTimer } from '@/features/training/rest-timer';
import { Countdown, elapsedStr, SET_GRID, SetRow } from '@/features/training/session-parts';
import { endRestActivity } from '@/features/widgets/native';
import type { Dictionary } from '@/i18n';
import type { TrainingPlan, Training } from '@/lib/sync/data';
import {
  addSet, patchSet, progress, removeExercise, removeSet, volumeKg,
  type CompletedWorkout, type Draft, type DraftExercise, type ExerciseHistory,
} from '@/lib/sync/workout';
import { fireConfetti } from '@/lib/confetti';
import { cn } from '@/lib/utils';
import { uuid } from '@/lib/sync/engine';

type PlanDay = TrainingPlan['days'][number];

const muscleName = (t: Dictionary, m: string) => (t.training.muscles as Record<string, string>)[m] ?? m;

function targetOf(e: PlanDay['exercises'][number], setsWord: string): string {
  if (e.type === 'CARDIO') {
    const parts = [
      e.targetDurationSec ? `${Math.round(e.targetDurationSec / 60)} min` : null,
      e.targetDistanceMeters ? `${(e.targetDistanceMeters / 1000).toFixed(1)} km` : null,
    ].filter(Boolean);
    return parts.join(' · ') || `${e.targetSets} ${setsWord}`;
  }
  return e.targetRepsMin && e.targetRepsMax ? `${e.targetSets}×${e.targetRepsMin}-${e.targetRepsMax}` : `${e.targetSets} ${setsWord}`;
}

/** Antes de arrancar: qué toca hoy y un botón grande, igual que en la web. */
export function Ready({ t, day, onStart, onBack }: { t: Dictionary; day: PlanDay; onStart: () => void; onBack: () => void }) {
  const tr = t.training.session.ready;
  const [counting, setCounting] = useState(false);
  const [line] = useState(() => tr.lines[Math.floor(Math.random() * tr.lines.length)] ?? '');
  const muscles = [...new Set(day.exercises.map((e) => muscleName(t, e.primaryMuscle)))].slice(0, 5);
  const minutes = Math.max(
    1,
    Math.round(
      day.exercises.reduce((n, e) => n + (e.type === 'CARDIO' ? (e.targetDurationSec ?? 1800) : Math.max(1, e.targetSets) * ((e.restSeconds ?? 90) + 45)), 0) / 60,
    ),
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {counting ? <Countdown label={tr.go} onDone={onStart} /> : null}
      <div className="flex-1 overflow-y-auto px-5 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="mx-auto max-w-md">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3 mb-2 text-muted-foreground">
            <ChevronLeft className="size-4" />
            {t.training.title}
          </Button>
          <div className="rounded-3xl bg-gradient-to-br from-primary/25 via-primary/10 to-transparent p-5">
            <div className="mb-4 flex items-center gap-2 text-primary">
              <Dumbbell className="size-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">{tr.kicker}</span>
            </div>
            <h1 className="text-3xl font-extrabold leading-tight">{day.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{line}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary">
                {day.exercises.length} {tr.exercises}
              </Badge>
              <Badge variant="secondary">
                <Timer className="size-3.5" />~{minutes} min
              </Badge>
              {muscles.map((m) => (
                <Badge key={m}>{m}</Badge>
              ))}
            </div>
          </div>
          <ol className="mb-4 mt-6 space-y-1.5">
            {day.exercises.map((e, i) => (
              <li key={e.id} className="rounded-2xl border bg-card p-2 pr-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold tabular-nums text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 font-medium">{e.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{targetOf(e, tr.sets)}</span>
                </div>
                {e.notes ? <p className="mt-1.5 whitespace-pre-line pl-14 text-xs text-muted-foreground">{e.notes}</p> : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="border-t bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button size="lg" className="mx-auto flex h-14 w-full max-w-md text-base font-bold tracking-wide" onClick={() => setCounting(true)} disabled={day.exercises.length === 0}>
          {tr.start}
        </Button>
      </div>
    </div>
  );
}

type Update = (change: (draft: Draft | null) => Draft | null) => Promise<void>;

/** El entrenamiento en curso. Todo lo que se toca queda guardado en el teléfono al momento. */
export function Session({
  t,
  draft,
  history,
  saveError,
  update,
  onMinimize,
  onDiscard,
  onFinish,
}: {
  t: Dictionary;
  draft: Draft;
  history: Training['history'];
  saveError: boolean;
  update: Update;
  onMinimize: () => void;
  onDiscard: () => void;
  onFinish: (effort: number | null) => Promise<void>;
}) {
  const ts = t.training.session;
  const [now, setNow] = useState(() => Date.now());
  const [finishOpen, setFinishOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // El descanso sobrevive a que el sistema recargue la app: el fin se guarda y, si no pasó, el cronómetro vuelve.
  const restKey = `forza-rest-${draft.workoutId}`;
  const [restEndsAt, setRestEndsAt] = useState<number | null>(() => {
    try {
      const saved = Number(localStorage.getItem(restKey));
      return saved > Date.now() ? saved : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    try {
      if (restEndsAt) localStorage.setItem(restKey, String(restEndsAt));
      else localStorage.removeItem(restKey);
    } catch {
      /* sin almacenamiento, el descanso sólo vive con la pantalla abierta */
    }
  }, [restEndsAt, restKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearInterval(timer);
      document.body.style.overflow = previous;
    };
  }, []);

  /** Cada cambio se guarda al momento; si falla, el aviso aparece arriba. */
  const change = (fn: (d: Draft) => Draft) => void update((d) => (d ? fn(d) : d)).catch(() => undefined);

  const stats = progress(draft);
  const endRest = () => {
    setRestEndsAt(null);
    // Se borra acá mismo: al terminar o cancelar, esta pantalla se cierra antes de que corra el efecto que lo guarda.
    try {
      localStorage.removeItem(restKey);
    } catch {
      /* sin almacenamiento no hay nada que borrar */
    }
    void endRestActivity();
  };
  const discard = () => {
    endRest();
    onDiscard();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="border-b bg-background/90">
        <div className="flex items-center gap-2 px-3 pt-[calc(0.5rem+env(safe-area-inset-top))]">
          <button type="button" onClick={onMinimize} aria-label={ts.minimize} className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary">
            <ChevronLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-muted-foreground">{draft.name}</p>
            <p className="text-2xl font-extrabold leading-none tabular-nums">{elapsedStr(Date.parse(draft.startedAt), now)}</p>
          </div>
          {stats.done === 0 ? (
            <button type="button" aria-label={ts.cancelWorkout} onClick={() => setConfirmDiscard(true)} className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary">
              <X className="size-5" />
            </button>
          ) : null}
          <Button size="sm" className="rounded-full px-5 font-bold" onClick={() => setFinishOpen(true)}>
            {ts.finish}
          </Button>
        </div>
        <div className="flex items-center gap-2 px-4 pb-2.5 pt-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}%` }} />
          </div>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {stats.done}/{stats.total} {ts.setsShort}
          </span>
        </div>
      </div>

      {saveError ? (
        <p role="alert" className="bg-warning/15 px-3 py-1.5 text-center text-xs font-medium text-warning">
          No se pudo guardar en el teléfono. No cierres la app y liberá espacio.
        </p>
      ) : null}

      <div className="flex-1 overflow-y-auto overscroll-contain bg-secondary/30 px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto max-w-2xl space-y-4">
          {draft.exercises.length === 0 ? <p className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">{ts.emptyWorkout}</p> : null}
          {draft.exercises.map((ex, i) => (
            <ExerciseCard
              key={ex.id}
              t={t}
              ex={ex}
              index={i}
              past={history?.[ex.exerciseId]}
              change={change}
              onCompleted={() => {
                primeRestAudio();
                setRestEndsAt(Date.now() + (ex.restSeconds ?? 90) * 1000);
              }}
            />
          ))}
        </div>
      </div>

      {restEndsAt ? (
        <RestTimer endsAt={restEndsAt} label={draft.name} onSkip={() => setRestEndsAt(null)} onExtend={(sec) => setRestEndsAt((v) => (v ?? Date.now()) + sec * 1000)} />
      ) : null}

      <FinishDialog
        t={t}
        open={finishOpen}
        noneDone={stats.done === 0}
        onOpenChange={setFinishOpen}
        onDiscard={() => {
          setFinishOpen(false);
          setConfirmDiscard(true);
        }}
        onFinish={async (effort) => {
          await onFinish(effort);
          endRest();
        }}
      />

      <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ts.cancelConfirm}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setConfirmDiscard(false)}>{t.common.cancel}</Button>
            <Button variant="destructive" onClick={discard}>{ts.cancelWorkout}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExerciseCard({
  t, ex, index, past, change, onCompleted,
}: {
  t: Dictionary;
  ex: DraftExercise;
  index: number;
  past: ExerciseHistory | undefined;
  change: (fn: (d: Draft) => Draft) => void;
  onCompleted: () => void;
}) {
  const ts = t.training.session;
  const [tools, setTools] = useState(false);
  const cardio = ex.type === 'CARDIO';
  const repRange =
    !cardio && ex.targetRepsMin && ex.targetRepsMax
      ? ex.targetRepsMin === ex.targetRepsMax ? String(ex.targetRepsMin) : `${ex.targetRepsMin}–${ex.targetRepsMax}`
      : null;
  const workSets = ex.sets.filter((s) => !s.isWarmup);
  const allDone = workSets.length > 0 && workSets.every((s) => s.isCompleted);
  // Récord de peso: sólo si ya había un récord previo.
  const isPr = !cardio && past?.bestWeightKg != null && ex.sets.some((s) => s.isCompleted && !s.isWarmup && (s.weightKg ?? 0) > past.bestWeightKg!);
  const previousPr = useRef(isPr);
  useEffect(() => {
    if (isPr && !previousPr.current) fireConfetti(60);
    previousPr.current = isPr;
  }, [isPr]);
  const last = past && past.lastTime.length > 0 ? past.lastTime.map((s) => `${s.weightKg ?? '–'}×${s.reps ?? '–'}`).join(' · ') : null;

  return (
    <div className={cn('overflow-hidden rounded-2xl border bg-card shadow-sm transition-colors', allDone && 'border-success/40')}>
      <div className="flex items-start gap-3 p-3">
        <span className={cn('grid size-14 shrink-0 place-items-center rounded-xl text-lg font-extrabold tabular-nums', allDone ? 'bg-success/15 text-success' : 'bg-secondary text-muted-foreground')}>
          {allDone ? <Check className="size-6" strokeWidth={3} /> : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h2 className="text-base font-bold leading-snug">{ex.name}</h2>
            {isPr ? (
              <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">
                <Trophy className="size-3" />
                {t.training.pr.badge}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {cardio ? t.training.fields.cardio : muscleName(t, ex.primaryMuscle)}
            {repRange ? <span className="tabular-nums">{' · '}{workSets.length} × {repRange}</span> : null}
          </p>
          {!cardio ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {ts.lastTime}: <span className="font-medium tabular-nums text-foreground/80">{last ?? ts.noLastTime}</span>
            </p>
          ) : null}
          {ex.notes ? <p className="mt-1 whitespace-pre-line text-[11px] text-muted-foreground">{ex.notes}</p> : null}
        </div>
        <button type="button" onClick={() => setTools((v) => !v)} aria-expanded={tools} aria-label={`${t.common.edit}: ${ex.name}`} className={cn('grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground', tools && 'bg-secondary text-foreground')}>
          <MoreHorizontal className="size-5" />
        </button>
      </div>

      {tools ? (
        <div className="flex border-t bg-secondary/40 px-2 py-1.5">
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-destructive" onClick={() => change((d) => removeExercise(d, ex.id))}>
            <Trash2 className="size-3.5" />
            {t.training.remove}
          </Button>
        </div>
      ) : null}

      <div className="px-3 pb-3">
        <div className={cn('mb-1 grid items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground', SET_GRID)}>
          <span className="text-center">#</span>
          <span className="text-center">{cardio ? ts.min : ts.kg}</span>
          <span className="text-center">
            {cardio ? ts.km : ts.reps}
            {repRange ? <span className="ml-1 normal-case tabular-nums opacity-70">({repRange})</span> : null}
          </span>
          <span />
          <span />
        </div>
        <div className="space-y-1.5">
          {ex.sets.map((s, i) => (
            <SetRow
              key={s.id}
              t={t}
              set={s}
              cardio={cardio}
              repsMin={ex.targetRepsMin}
              repsMax={ex.targetRepsMax}
              prevWeight={past?.lastTime[i]?.weightKg ?? null}
              prevReps={past?.lastTime[i]?.reps ?? null}
              onWeight={(v) => change((d) => patchSet(d, ex.id, s.id, { weightKg: v }))}
              onReps={(v) => change((d) => patchSet(d, ex.id, s.id, { reps: v }))}
              onDuration={(v) => change((d) => patchSet(d, ex.id, s.id, { durationSeconds: v }))}
              onDistance={(v) => change((d) => patchSet(d, ex.id, s.id, { distanceMeters: v }))}
              onWarmup={() => change((d) => patchSet(d, ex.id, s.id, { isWarmup: !s.isWarmup }))}
              onToggle={() => {
                change((d) => patchSet(d, ex.id, s.id, { isCompleted: !s.isCompleted }));
                if (!s.isCompleted) onCompleted();
              }}
              onRemove={() => change((d) => removeSet(d, ex.id, s.id))}
            />
          ))}
        </div>
        <button type="button" onClick={() => change((d) => addSet(d, ex.id, uuid))} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2 text-xs font-medium text-muted-foreground">
          <Plus className="size-4" />
          {ts.addSet}
        </button>
      </div>
    </div>
  );
}

function FinishDialog({
  t, open, noneDone, onOpenChange, onFinish, onDiscard,
}: {
  t: Dictionary;
  open: boolean;
  noneDone: boolean;
  onOpenChange: (v: boolean) => void;
  onFinish: (effort: number | null) => Promise<void>;
  onDiscard: () => void;
}) {
  const [effort, setEffort] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.training.session.finishConfirm}</DialogTitle>
        </DialogHeader>
        {noneDone ? <p className="text-sm text-warning">Todavía no marcaste ninguna serie como hecha.</p> : null}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t.training.session.effort}</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" onClick={() => setEffort(n === effort ? null : n)} aria-pressed={effort === n} aria-label={`Esfuerzo ${n}`} className={cn('size-9 rounded-md border text-sm font-medium tabular-nums', effort === n && 'border-primary bg-primary text-primary-foreground')}>
                {n}
              </button>
            ))}
          </div>
        </div>
        {failed ? <p role="alert" className="text-sm text-warning">No se pudo guardar en el teléfono. El entrenamiento sigue abierto: probá de nuevo.</p> : null}
        <div className="flex gap-2">
          <Button variant="ghost" className="text-destructive" disabled={busy} onClick={onDiscard}>
            {t.training.session.cancelWorkout}
          </Button>
          <Button
            className="flex-1"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setFailed(false);
              onFinish(effort).catch(() => {
                setFailed(true);
                setBusy(false);
              });
            }}
          >
            {busy ? t.common.loading : t.training.session.finish}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Lo que se hizo, apenas se termina. */
export function Summary({ t, workout, pending, onClose }: { t: Dictionary; workout: CompletedWorkout; pending: boolean; onClose: () => void }) {
  const minutes = Math.max(1, Math.round((Date.parse(workout.finishedAt) - Date.parse(workout.startedAt)) / 60000));
  const { done, total } = progress(workout);
  const stats = [
    { label: 'Duración', value: `${minutes} min` },
    { label: 'Series', value: `${done}/${total}` },
    { label: 'Volumen', value: `${volumeKg(workout).toLocaleString('es-AR')} kg` },
  ];
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-center">
      <span className="grid size-20 place-items-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-10" strokeWidth={3} />
      </span>
      <div>
        <h1 className="text-2xl font-extrabold">¡Entrenamiento terminado!</h1>
        <p className="mt-1 text-sm text-muted-foreground">{workout.name}</p>
      </div>
      <div className="grid w-full max-w-sm grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-3">
            <p className="text-lg font-bold tabular-nums">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="max-w-sm text-sm text-muted-foreground" role="status">
        {pending ? 'Quedó guardado en el teléfono. Se sube solo cuando haya señal.' : 'Guardado y subido a tu cuenta.'}
      </p>
      <Button size="lg" className="w-full max-w-sm" onClick={onClose}>
        {t.training.title}
      </Button>
    </div>
  );
}
