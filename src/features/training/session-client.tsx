'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { DecimalInput } from '@/components/form/decimal-input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRightLeft, Check, ChevronLeft, Dumbbell, Loader2, MoreHorizontal, Plus, Timer, Trash2, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useT } from '@/i18n/provider';
import { interpolate } from '@/i18n/interpolate';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/i18n';
import type { WorkoutSession } from './queries';
import { useSession, type StoreExercise, type StoreSet } from './session-store';
import { ExercisePicker } from './exercise-picker';
import { RestTimer, primeRestAudio } from './rest-timer';
import { ExerciseThumb } from './exercise-demo';
import { exerciseMedia } from './exercise-media';
import { fireConfetti } from '@/lib/confetti';
import {
  addWorkoutExercise,
  discardWorkout,
  finishWorkout,
  findExerciseVariants,
  swapWorkoutExercise,
  type ExerciseVariant,
  removeWorkoutExercise,
  restartWorkoutClock,
  saveWorkout,
} from './actions';

function elapsedStr(fromMs: number | null, now: number): string {
  if (!fromMs) return '0:00';
  const s = Math.max(0, Math.floor((now - fromMs) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

function estMinutes(exs: WorkoutSession['exercises']): number {
  const secs = exs.reduce((acc, e) => {
    if (e.type === 'CARDIO') return acc + (e.targetDurationSec ?? 1800);
    const sets = e.sets.length || 3;
    return acc + sets * ((e.restSeconds ?? 90) + 45);
  }, 0);
  return Math.max(1, Math.round(secs / 60));
}

export function SessionClient({ session }: { session: WorkoutSession }) {
  const t = useT();
  const router = useRouter();
  const ts = t.training.session;

  const hydrate = useSession((s) => s.hydrate);
  const exercises = useSession((s) => s.exercises);
  const dirty = useSession((s) => s.dirty);
  const markClean = useSession((s) => s.markClean);
  const dropExercise = useSession((s) => s.dropExercise);
  const swapExercise = useSession((s) => s.swapExercise);

  const alreadyLogged = useMemo(
    () => session.exercises.some((e) => e.sets.some((s) => s.isCompleted)),
    [session.exercises],
  );

  const [started, setStarted] = useState(alreadyLogged);
  const [clockStart, setClockStart] = useState<number | null>(
    session.startedAt ? new Date(session.startedAt).getTime() : null,
  );
  const [saving, startSave] = useTransition();
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [finishOpen, setFinishOpen] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);

  useEffect(() => {
    hydrate(session);
  }, [session, hydrate]);

  // Modo foco: sin scroll del fondo mientras dura el entreno.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(h);
  }, []);

  // Autosave debounced. Si falla (offline), la sesión queda en localStorage
  // (persist de Zustand) y se reintenta al recuperar la conexión.
  const savingRef = useRef(false);
  const [retryTick, setRetryTick] = useState(0);
  useEffect(() => {
    if (!dirty || savingRef.current) return;
    const h = setTimeout(() => {
      savingRef.current = true;
      startSave(async () => {
        try {
          const res = await saveWorkout(useSession.getState().payload());
          if (res.ok) {
            markClean();
            setSavedLocally(false);
          }
        } catch {
          setSavedLocally(true);
        } finally {
          savingRef.current = false;
        }
      });
    }, 1500);
    return () => clearTimeout(h);
  }, [dirty, exercises, markClean, retryTick]);

  useEffect(() => {
    const onOnline = () => setRetryTick((n) => n + 1);
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  async function saveNow() {
    if (useSession.getState().dirty) {
      const res = await saveWorkout(useSession.getState().payload());
      if (res.ok) markClean();
      return res.ok;
    }
    return true;
  }

  /** Borra el entrenamiento (si no estaba terminado) y vuelve a Entrenar. */
  async function cancelWorkout() {
    try {
      useSession.persist.clearStorage();
    } catch {
      /* noop */
    }
    await discardWorkout({ id: session.id });
  }

  function begin() {
    setStarted(true);
    if (!alreadyLogged) {
      setClockStart(Date.now());
      void restartWorkoutClock({ id: session.id });
    }
  }

  const setStats = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (s.isWarmup) continue;
        total += 1;
        if (s.isCompleted) done += 1;
      }
    }
    return { done, total };
  }, [exercises]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {!started ? (
        <ReadyScreen t={t} session={session} onStart={begin} onCancel={cancelWorkout} />
      ) : null}

      {/* Barra superior: cronómetro grande + avance */}
      <div className="border-b bg-background/90 backdrop-blur">
        <div className="flex items-center gap-2 px-3 pt-2">
          <Link
            href="/training"
            aria-label={ts.minimize}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-muted-foreground">{session.name}</p>
            <p className="text-2xl font-extrabold leading-none tabular-nums">{elapsedStr(clockStart, now)}</p>
          </div>
          {setStats.done === 0 ? (
            <button
              type="button"
              aria-label={ts.cancelWorkout}
              title={ts.cancelWorkout}
              onClick={() => {
                if (confirm(ts.cancelConfirm)) void cancelWorkout();
              }}
              className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-destructive"
            >
              <X className="size-5" />
            </button>
          ) : null}
          <Button size="sm" className="rounded-full px-5 font-bold" onClick={() => setFinishOpen(true)}>
            {ts.finish}
          </Button>
        </div>
        <div className="flex items-center gap-2 px-4 pb-2.5 pt-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{
                width: `${setStats.total > 0 ? Math.round((setStats.done / setStats.total) * 100) : 0}%`,
              }}
            />
          </div>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {setStats.done}/{setStats.total} {ts.setsShort}
          </span>
          {saving ? <Loader2 className="size-3 animate-spin text-muted-foreground" /> : null}
        </div>
      </div>

      {savedLocally ? (
        <p className="bg-warning/10 px-3 py-1 text-center text-xs text-warning">{ts.savedOffline}</p>
      ) : null}

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto overscroll-contain bg-secondary/30 px-3 pb-28 pt-3">
        <div className="mx-auto max-w-2xl space-y-4">
          {exercises.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {ts.emptyWorkout}
              </CardContent>
            </Card>
          ) : (
            exercises.map((ex, i) => (
              <ExerciseBlock
                key={ex.id}
                t={t}
                ex={ex}
                index={i}
                onCompleted={(restSeconds) => {
                  primeRestAudio();
                  setRestEndsAt(Date.now() + (restSeconds ?? 90) * 1000);
                }}
                onRemove={async () => {
                  dropExercise(ex.id);
                  await removeWorkoutExercise({ id: ex.id });
                }}
                excludeIds={exercises.map((x) => x.exerciseId)}
                onSwap={async (variant) => {
                  const res = await swapWorkoutExercise({ id: ex.id, exerciseId: variant.id });
                  if (res.ok && res.data) {
                    swapExercise(ex.id, {
                      exerciseId: res.data.id,
                      name: res.data.name,
                      type: res.data.type,
                      primaryMuscle: res.data.primaryMuscle,
                    });
                    toast.success(t.training.session.swapped);
                    router.refresh();
                    return true;
                  }
                  toast.error(t.training.toast.genericError);
                  return false;
                }}
              />
            ))
          )}

          <ExercisePicker
            onPick={async (exerciseId) => {
              const res = await addWorkoutExercise({ workoutId: session.id, exerciseId });
              if (res.ok && res.data) {
                toast.success(t.training.toast.exerciseAdded);
                router.refresh();
              } else {
                toast.error(t.training.toast.genericError);
              }
            }}
          >
            <Button variant="outline" className="h-12 w-full rounded-2xl border-dashed">
              <Plus className="size-4" />
              {t.training.addExercise}
            </Button>
          </ExercisePicker>
        </div>
      </div>

      {restEndsAt ? (
        <RestTimer
          endsAt={restEndsAt}
          onSkip={() => setRestEndsAt(null)}
          onExtend={(sec) => setRestEndsAt((v) => (v ?? Date.now()) + sec * 1000)}
        />
      ) : null}

      <FinishDialog
        t={t}
        open={finishOpen}
        onOpenChange={setFinishOpen}
        onDiscard={() => discardWorkout({ id: session.id })}
        onFinish={async (effort) => {
          try {
            await saveNow();
            await finishWorkout({ workoutId: session.id, perceivedEffort: effort });
          } catch {
            toast.error(ts.finishOffline);
            throw new Error('offline');
          }
        }}
      />
    </div>
  );
}

/* ================================================================== */
/* Pantalla de arranque + cuenta regresiva                            */
/* ================================================================== */

function ReadyScreen({
  t,
  session,
  onStart,
  onCancel,
}: {
  t: Dictionary;
  session: WorkoutSession;
  onStart: () => void;
  onCancel: () => Promise<void>;
}) {
  const tr = t.training.session.ready;
  const [counting, setCounting] = useState(false);
  const [cancelling, startCancel] = useTransition();

  const line = useMemo(() => {
    const arr = tr.lines;
    return arr[Math.floor(Math.random() * arr.length)] ?? '';
  }, [tr.lines]);

  const muscles = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of session.exercises) {
      if (seen.has(e.primaryMuscle)) continue;
      seen.add(e.primaryMuscle);
      out.push(t.training.muscles[e.primaryMuscle as 'CHEST']);
    }
    return out.slice(0, 5);
  }, [session.exercises, t.training.muscles]);

  const mins = estMinutes(session.exercises);

  if (counting) {
    return <Countdown label={tr.go} onDone={onStart} />;
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto px-5 pt-10">
        <div className="mx-auto max-w-md">
          <div className="rounded-3xl bg-gradient-to-br from-primary/25 via-primary/10 to-transparent p-5">
            <div className="mb-4 flex items-center gap-2 text-primary">
              <Dumbbell className="size-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">{tr.kicker}</span>
            </div>

            <h1 className="text-3xl font-extrabold leading-tight">{session.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{line}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary">
                {session.exercises.length} {tr.exercises}
              </Badge>
              <Badge variant="secondary">
                <Timer className="size-3.5" />~{mins} min
              </Badge>
              {muscles.map((m) => (
                <Badge key={m}>{m}</Badge>
              ))}
            </div>
          </div>

          {session.exercises.length > 0 ? (
            <ol className="mt-6 space-y-1.5">
              {session.exercises.map((e, i) => {
                const target =
                  e.type === 'CARDIO'
                    ? [
                        e.targetDurationSec ? `${Math.round(e.targetDurationSec / 60)} min` : null,
                        e.targetDistanceMeters ? `${(e.targetDistanceMeters / 1000).toFixed(1)} km` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || `${e.sets.length || 1} ${tr.sets}`
                    : e.targetRepsMin && e.targetRepsMax
                      ? `${e.sets.length || 3}×${e.targetRepsMin}-${e.targetRepsMax}`
                      : `${e.sets.length || 3} ${tr.sets}`;
                return (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 rounded-2xl border bg-card p-2 pr-3 text-sm"
                  >
                    {exerciseMedia(e.name) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={exerciseMedia(e.name)![0]}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-11 shrink-0 rounded-xl bg-secondary object-cover"
                      />
                    ) : (
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold tabular-nums text-muted-foreground">
                        {i + 1}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate font-medium">{e.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{target}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">{tr.freeHint}</p>
          )}
        </div>
      </div>

      <div className="border-t bg-background/95 p-4 backdrop-blur">
        <Button
          size="lg"
          className="mx-auto flex h-14 w-full max-w-md text-base font-bold tracking-wide"
          onClick={() => setCounting(true)}
        >
          {tr.start}
        </Button>
        <Button
          variant="ghost"
          className="mx-auto mt-2 flex w-full max-w-md text-muted-foreground"
          disabled={cancelling}
          onClick={() => startCancel(() => onCancel())}
        >
          {cancelling ? <Loader2 className="animate-spin" /> : null}
          {t.training.session.cancelWorkout}
        </Button>
      </div>
    </div>
  );
}

function Countdown({ label, onDone }: { label: string; onDone: () => void }) {
  const [step, setStep] = useState(0); // 0..2 = 3/2/1, 3 = go
  const doneRef = useRef(false);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }

  useEffect(() => {
    const seq = [700, 700, 700, 600];
    const h = setTimeout(() => {
      if (step < 3) setStep(step + 1);
      else finish();
    }, seq[step]);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const text = step < 3 ? String(3 - step) : label;

  return (
    <button
      type="button"
      onClick={finish}
      aria-label={label}
      className="absolute inset-0 z-20 grid place-items-center bg-background"
    >
      <span
        key={step}
        className={cn(
          'animate-count-pop select-none font-extrabold tabular-nums',
          step < 3 ? 'text-8xl' : 'text-6xl text-primary',
        )}
      >
        {text}
      </span>
    </button>
  );
}

/* ================================================================== */

function ExerciseBlock({
  t,
  ex,
  index,
  onCompleted,
  onRemove,
  onSwap,
  excludeIds,
}: {
  t: Dictionary;
  ex: StoreExercise;
  index: number;
  onCompleted: (restSeconds: number | null) => void;
  onRemove: () => void;
  onSwap: (variant: ExerciseVariant) => Promise<boolean>;
  excludeIds: string[];
}) {
  const patchSet = useSession((s) => s.patchSet);
  const toggleComplete = useSession((s) => s.toggleComplete);
  const addSet = useSession((s) => s.addSet);
  const removeSet = useSession((s) => s.removeSet);
  const [tools, setTools] = useState(false);
  const cardio = ex.type === 'CARDIO';
  const ts = t.training.session;

  const repRange =
    !cardio && ex.targetRepsMin && ex.targetRepsMax
      ? ex.targetRepsMin === ex.targetRepsMax
        ? String(ex.targetRepsMin)
        : `${ex.targetRepsMin}–${ex.targetRepsMax}`
      : null;
  const workSets = ex.sets.filter((x) => !x.isWarmup);
  const plannedSets = workSets.length;
  const allDone = workSets.length > 0 && workSets.every((x) => x.isCompleted);
  // Récord de peso: sólo si ya había un récord previo.
  const isPr =
    !cardio &&
    ex.bestWeightKg != null &&
    ex.sets.some((x) => x.isCompleted && !x.isWarmup && (x.weightKg ?? 0) > (ex.bestWeightKg ?? 0));

  // Confeti sólo en el momento en que se rompe el récord, no al entrar con el récord ya roto.
  const prevPr = useRef(isPr);
  useEffect(() => {
    if (isPr && !prevPr.current) fireConfetti(60);
    prevPr.current = isPr;
  }, [isPr]);

  const last =
    ex.lastTime && ex.lastTime.length > 0
      ? ex.lastTime.map((s) => `${s.weightKg ?? '–'}×${s.reps ?? '–'}`).join(' · ')
      : null;

  const muscle = cardio ? t.training.fields.cardio : t.training.muscles[ex.primaryMuscle as 'CHEST'];

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border bg-card shadow-sm transition-colors',
        allDone && 'border-success/40',
      )}
    >
      <div className="flex items-start gap-3 p-3">
        <ExerciseThumb name={ex.name} index={index} done={allDone} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <Link
              href={`/training/exercises/${ex.exerciseId}`}
              className="text-base font-bold leading-snug hover:underline"
            >
              {ex.name}
            </Link>
            {isPr ? (
              <span
                title={t.training.pr.MAX_WEIGHT}
                aria-label={t.training.pr.MAX_WEIGHT}
                className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning"
              >
                <Trophy className="size-3" />
                {t.training.pr.badge}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {muscle}
            {repRange ? (
              <span className="tabular-nums">
                {' · '}
                {plannedSets} × {repRange}
              </span>
            ) : null}
          </p>
          {!cardio ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {ts.lastTime}:{' '}
              <span className="font-medium tabular-nums text-foreground/80">{last ?? ts.noLastTime}</span>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setTools((v) => !v)}
          aria-expanded={tools}
          aria-label={t.common.edit}
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary',
            tools && 'bg-secondary text-foreground',
          )}
        >
          <MoreHorizontal className="size-5" />
        </button>
      </div>

      {tools ? (
        <div className="flex flex-wrap items-center gap-1 border-t bg-secondary/40 px-2 py-1.5">
          {cardio ? null : <VariantPicker t={t} ex={ex} excludeIds={excludeIds} onSwap={onSwap} />}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
            {t.training.remove}
          </Button>
        </div>
      ) : null}

      <div className="px-3 pb-3">
        <div
          className={cn(
            'mb-1 grid items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground',
            SET_GRID,
          )}
        >
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
          {ex.sets.map((st, i) => (
            <SetRow
              key={st.id}
              t={t}
              set={st}
              cardio={cardio}
              repsMin={ex.targetRepsMin}
              repsMax={ex.targetRepsMax}
              prevWeight={ex.lastTime?.[i]?.weightKg ?? null}
              prevReps={ex.lastTime?.[i]?.reps ?? null}
              onWeight={(v) => patchSet(ex.id, st.id, { weightKg: v })}
              onReps={(v) => patchSet(ex.id, st.id, { reps: v })}
              onDuration={(v) => patchSet(ex.id, st.id, { durationSeconds: v })}
              onDistance={(v) => patchSet(ex.id, st.id, { distanceMeters: v })}
              onWarmup={() => patchSet(ex.id, st.id, { isWarmup: !st.isWarmup })}
              onToggle={() => {
                const nowDone = toggleComplete(ex.id, st.id);
                if (nowDone) onCompleted(ex.restSeconds);
              }}
              onRemove={() => removeSet(ex.id, st.id)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => addSet(ex.id)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="size-4" />
          {ts.addSet}
        </button>
      </div>
    </div>
  );
}

/** Columnas de la grilla de series: número, dos campos, tilde y borrar. */
const SET_GRID = 'grid-cols-[2.25rem_1fr_1fr_3rem_1.25rem]';

/** "Máquina ocupada": busca variantes del ejercicio y permite cambiarlo sin perder las series. */
function VariantPicker({
  t,
  ex,
  excludeIds,
  onSwap,
}: {
  t: Dictionary;
  ex: StoreExercise;
  excludeIds: string[];
  onSwap: (variant: ExerciseVariant) => Promise<boolean>;
}) {
  const ts = t.training.session;
  const [open, setOpen] = useState(false);
  const [variants, setVariants] = useState<ExerciseVariant[] | null>(null);
  const [swapping, setSwapping] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setVariants(null);
    findExerciseVariants({ exerciseId: ex.exerciseId, excludeIds })
      .then((v) => alive && setVariants(v))
      .catch(() => alive && setVariants([]));
    return () => {
      alive = false;
    };
    // sólo al abrir o si cambia el ejercicio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ex.exerciseId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
          <ArrowRightLeft className="size-3.5" />
          {ts.busyMachine}
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-2 p-4">
        <DialogHeader>
          <DialogTitle>{interpolate(ts.variantsTitle, { name: ex.name })}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{ts.variantsHint}</p>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {variants === null ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : variants.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{ts.variantsEmpty}</p>
          ) : (
            <ul className="divide-y">
              {variants.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    disabled={swapping !== null}
                    onClick={async () => {
                      setSwapping(v.id);
                      const ok = await onSwap(v);
                      setSwapping(null);
                      if (ok) setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-secondary/50 active:bg-secondary"
                  >
                    <span className="text-sm font-medium">{v.name}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {v.equipment}
                      {swapping === v.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SetRow({
  t,
  set,
  cardio,
  repsMin,
  repsMax,
  prevWeight,
  prevReps,
  onWeight,
  onReps,
  onDuration,
  onDistance,
  onWarmup,
  onToggle,
  onRemove,
}: {
  t: Dictionary;
  set: StoreSet;
  cardio: boolean;
  repsMin: number | null;
  repsMax: number | null;
  /** Lo que hizo la última vez en esta misma serie (se ve de fondo como guía). */
  prevWeight: number | null;
  prevReps: number | null;
  onWeight: (v: number | null) => void;
  onReps: (v: number | null) => void;
  onDuration: (v: number | null) => void;
  onDistance: (v: number | null) => void;
  onWarmup: () => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const parseNum = (s: string): number | null => {
    if (s === '') return null;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };

  // Objetivo de repeticiones del ejercicio vs lo que cargaste (no aplica al calentamiento).
  const range =
    repsMin && repsMax && !set.isWarmup
      ? repsMin === repsMax
        ? String(repsMin)
        : `${repsMin}–${repsMax}`
      : null;
  const repsStatus: 'below' | 'in' | 'above' | null =
    range && set.reps != null
      ? set.reps < (repsMin ?? 0)
        ? 'below'
        : set.reps > (repsMax ?? Infinity)
          ? 'above'
          : 'in'
      : null;

  const field = cn(
    'h-12 rounded-xl border-0 bg-secondary/70 text-center text-lg font-bold tabular-nums shadow-none',
    'placeholder:font-medium placeholder:text-muted-foreground/50',
    'focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary',
    set.isCompleted && 'bg-transparent text-success',
  );

  return (
    <div
      className={cn(
        'grid items-center gap-2 rounded-xl px-1 py-1 transition-colors',
        SET_GRID,
        set.isCompleted && 'bg-success/10',
      )}
    >
      <button
        type="button"
        onClick={onWarmup}
        aria-pressed={set.isWarmup}
        aria-label={t.training.session.warmup}
        className={cn(
          'grid size-9 place-items-center rounded-full text-sm font-bold transition-colors',
          set.isWarmup ? 'bg-warning/20 text-warning' : 'bg-secondary text-muted-foreground',
        )}
      >
        {set.isWarmup ? t.training.session.warmup : set.setNumber}
      </button>

      {cardio ? (
        <>
          <DecimalInput
            placeholder="min"
            value={set.durationSeconds != null ? set.durationSeconds / 60 : null}
            onValueChange={(v) => onDuration(v != null ? Math.round(v * 60) : null)}
            className={field}
          />
          <DecimalInput
            placeholder="km"
            value={set.distanceMeters != null ? set.distanceMeters / 1000 : null}
            onValueChange={(v) => onDistance(v != null ? Math.round(v * 1000) : null)}
            className={field}
          />
        </>
      ) : (
        <>
          <DecimalInput
            placeholder={prevWeight != null ? String(prevWeight) : 'kg'}
            value={set.weightKg ?? null}
            onValueChange={onWeight}
            className={field}
          />
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={prevReps != null ? String(prevReps) : (range ?? 'reps')}
            value={set.reps ?? ''}
            onChange={(e) => onReps(parseNum(e.target.value))}
            className={cn(
              field,
              repsStatus === 'below' && 'text-warning ring-2 ring-warning/70',
              repsStatus === 'in' && !set.isCompleted && 'ring-2 ring-success/50',
            )}
          />
        </>
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-label={t.training.session.done}
        aria-pressed={set.isCompleted}
        className={cn(
          'grid size-12 place-items-center rounded-full border-2 transition-colors',
          set.isCompleted
            ? 'anim-pop border-success bg-success text-white shadow-sm'
            : 'border-input text-muted-foreground/60 hover:border-primary hover:text-primary',
        )}
      >
        <Check className="size-6" strokeWidth={3} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t.common.delete}
        className="grid size-5 place-items-center text-muted-foreground/40 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function FinishDialog({
  t,
  open,
  onOpenChange,
  onFinish,
  onDiscard,
}: {
  t: Dictionary;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onFinish: (effort: number | null) => Promise<void>;
  onDiscard: () => void;
}) {
  const [effort, setEffort] = useState<number | null>(null);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.training.session.finishConfirm}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t.training.session.effort}</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setEffort(n === effort ? null : n)}
                aria-pressed={effort === n}
                aria-label={String(n)}
                className={cn(
                  'size-9 rounded-md border text-sm font-medium tabular-nums',
                  effort === n ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="text-destructive"
            disabled={pending}
            onClick={() => {
              if (confirm(t.training.session.cancelConfirm)) {
                try {
                  useSession.persist.clearStorage();
                } catch {
                  /* noop */
                }
                onDiscard();
              }
            }}
          >
            {t.training.session.cancelWorkout}
          </Button>
          <Button
            className="flex-1"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await onFinish(effort);
                try {
                  useSession.persist.clearStorage();
                } catch {
                  /* noop */
                }
              })
            }
          >
            {pending ? t.common.loading : t.training.session.finish}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
