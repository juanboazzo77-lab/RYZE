'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, ChevronLeft, Dumbbell, Loader2, Plus, Timer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/i18n';
import type { WorkoutSession } from './queries';
import { useSession, type StoreExercise, type StoreSet } from './session-store';
import { ExercisePicker } from './exercise-picker';
import { RestTimer } from './rest-timer';
import {
  addWorkoutExercise,
  discardWorkout,
  finishWorkout,
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
        <ReadyScreen t={t} session={session} onStart={begin} />
      ) : null}

      {/* Barra superior compacta */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Link
          href="/training"
          aria-label={ts.minimize}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{session.name}</p>
          <p className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
            <span>{elapsedStr(clockStart, now)}</span>
            <span>·</span>
            <span>
              {setStats.done}/{setStats.total} {ts.setsShort}
            </span>
            {saving ? <Loader2 className="size-3 animate-spin" /> : null}
          </p>
        </div>
        <Button size="sm" onClick={() => setFinishOpen(true)}>
          {ts.finish}
        </Button>
      </div>

      {savedLocally ? (
        <p className="bg-warning/10 px-3 py-1 text-center text-xs text-warning">{ts.savedOffline}</p>
      ) : null}

      {/* Progreso */}
      {setStats.total > 0 ? (
        <div className="h-1 w-full bg-secondary">
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${Math.round((setStats.done / setStats.total) * 100)}%` }}
          />
        </div>
      ) : null}

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-28 pt-3">
        <div className="mx-auto max-w-2xl space-y-3">
          {exercises.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {ts.emptyWorkout}
              </CardContent>
            </Card>
          ) : (
            exercises.map((ex) => (
              <ExerciseBlock
                key={ex.id}
                t={t}
                ex={ex}
                onCompleted={(restSeconds) =>
                  setRestEndsAt(Date.now() + (restSeconds ?? 90) * 1000)
                }
                onRemove={async () => {
                  dropExercise(ex.id);
                  await removeWorkoutExercise({ id: ex.id });
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
            <Button variant="outline" className="w-full">
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
}: {
  t: Dictionary;
  session: WorkoutSession;
  onStart: () => void;
}) {
  const tr = t.training.session.ready;
  const [counting, setCounting] = useState(false);

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
          <div className="mb-6 flex items-center gap-2 text-primary">
            <Dumbbell className="size-5" />
            <span className="text-sm font-medium uppercase tracking-wide">{tr.kicker}</span>
          </div>

          <h1 className="text-3xl font-extrabold leading-tight">{session.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{line}</p>

          <div className="mt-5 flex flex-wrap gap-2">
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

          {session.exercises.length > 0 ? (
            <ol className="mt-6 space-y-1.5">
              {session.exercises.map((e, i) => {
                const target =
                  e.targetRepsMin && e.targetRepsMax
                    ? `${e.sets.length || 3}×${e.targetRepsMin}-${e.targetRepsMax}`
                    : `${e.sets.length || 3} ${tr.sets}`;
                return (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold tabular-nums">
                      {i + 1}
                    </span>
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
  onCompleted,
  onRemove,
}: {
  t: Dictionary;
  ex: StoreExercise;
  onCompleted: (restSeconds: number | null) => void;
  onRemove: () => void;
}) {
  const patchSet = useSession((s) => s.patchSet);
  const toggleComplete = useSession((s) => s.toggleComplete);
  const addSet = useSession((s) => s.addSet);
  const removeSet = useSession((s) => s.removeSet);

  const last = ex.lastTime && ex.lastTime.length > 0
    ? ex.lastTime
        .map((s) => `${s.weightKg ?? '–'}×${s.reps ?? '–'}`)
        .join(' · ')
    : null;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
        <div className="min-w-0">
          <Link href={`/training/exercises/${ex.exerciseId}`} className="font-semibold hover:underline">
            {ex.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <Badge variant="secondary">{t.training.muscles[ex.primaryMuscle as 'CHEST']}</Badge>
            <span>
              {t.training.session.lastTime}: {last ?? t.training.session.noLastTime}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onRemove} aria-label={t.training.remove}>
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {ex.sets.map((st) => (
          <SetRow
            key={st.id}
            t={t}
            set={st}
            onWeight={(v) => patchSet(ex.id, st.id, { weightKg: v })}
            onReps={(v) => patchSet(ex.id, st.id, { reps: v })}
            onWarmup={() => patchSet(ex.id, st.id, { isWarmup: !st.isWarmup })}
            onToggle={() => {
              const nowDone = toggleComplete(ex.id, st.id);
              if (nowDone) onCompleted(ex.restSeconds);
            }}
            onRemove={() => removeSet(ex.id, st.id)}
          />
        ))}
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => addSet(ex.id)}>
          <Plus className="size-4" />
          {t.training.session.addSet}
        </Button>
      </CardContent>
    </Card>
  );
}

function SetRow({
  t,
  set,
  onWeight,
  onReps,
  onWarmup,
  onToggle,
  onRemove,
}: {
  t: Dictionary;
  set: StoreSet;
  onWeight: (v: number | null) => void;
  onReps: (v: number | null) => void;
  onWarmup: () => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const parseNum = (s: string): number | null => {
    if (s === '') return null;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border p-2',
        set.isCompleted && 'border-success/40 bg-success/10',
      )}
    >
      <button
        type="button"
        onClick={onWarmup}
        aria-pressed={set.isWarmup}
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-md border text-xs font-bold',
          set.isWarmup ? 'border-warning bg-warning/15 text-warning' : 'text-muted-foreground',
        )}
        aria-label={t.training.session.warmup}
      >
        {set.isWarmup ? t.training.session.warmup : set.setNumber}
      </button>

      <Input
        type="number"
        inputMode="decimal"
        step="any"
        min={0}
        placeholder="kg"
        value={set.weightKg ?? ''}
        onChange={(e) => onWeight(parseNum(e.target.value))}
        className="h-11 flex-1 text-center text-base font-semibold"
      />
      <span className="text-xs text-muted-foreground">{t.training.session.kg}</span>
      <span className="text-muted-foreground">×</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        placeholder="reps"
        value={set.reps ?? ''}
        onChange={(e) => onReps(parseNum(e.target.value))}
        className="h-11 flex-1 text-center text-base font-semibold"
      />
      <span className="text-xs text-muted-foreground">{t.training.session.reps}</span>

      <button
        type="button"
        onClick={onToggle}
        aria-label={t.training.session.done}
        aria-pressed={set.isCompleted}
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-md border transition-colors',
          set.isCompleted
            ? 'border-success bg-success text-white'
            : 'hover:border-primary hover:text-primary',
        )}
      >
        <Check className="size-5" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t.common.delete}
        className="shrink-0 text-muted-foreground hover:text-destructive"
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
              if (confirm(t.training.session.discard + '?')) {
                try {
                  useSession.persist.clearStorage();
                } catch {
                  /* noop */
                }
                onDiscard();
              }
            }}
          >
            {t.training.session.discard}
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
