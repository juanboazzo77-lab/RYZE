'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Loader2, Plus, Trash2 } from 'lucide-react';
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
  saveWorkout,
} from './actions';

function elapsedStr(fromISO: string | null, now: number): string {
  if (!fromISO) return '0:00';
  const s = Math.max(0, Math.floor((now - new Date(fromISO).getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

export function SessionClient({ session }: { session: WorkoutSession }) {
  const t = useT();
  const router = useRouter();

  const hydrate = useSession((s) => s.hydrate);
  const exercises = useSession((s) => s.exercises);
  const dirty = useSession((s) => s.dirty);
  const markClean = useSession((s) => s.markClean);
  const dropExercise = useSession((s) => s.dropExercise);

  const [saving, startSave] = useTransition();
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [finishOpen, setFinishOpen] = useState(false);

  useEffect(() => {
    hydrate(session);
  }, [session, hydrate]);

  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(h);
  }, []);

  // Autosave debounced.
  const savingRef = useRef(false);
  useEffect(() => {
    if (!dirty || savingRef.current) return;
    const h = setTimeout(() => {
      savingRef.current = true;
      startSave(async () => {
        const res = await saveWorkout(useSession.getState().payload());
        if (res.ok) markClean();
        savingRef.current = false;
      });
    }, 1500);
    return () => clearTimeout(h);
  }, [dirty, exercises, markClean]);

  async function saveNow() {
    if (useSession.getState().dirty) {
      const res = await saveWorkout(useSession.getState().payload());
      if (res.ok) markClean();
      return res.ok;
    }
    return true;
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-30 -mx-4 flex items-center justify-between gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur">
        <div>
          <p className="font-semibold leading-tight">{session.name}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {t.training.session.elapsed}: {elapsedStr(session.startedAt, now)}
            {saving ? ' · ' : ''}
            {saving ? <Loader2 className="inline size-3 animate-spin" /> : null}
          </p>
        </div>
        <Button size="sm" onClick={() => setFinishOpen(true)}>
          {t.training.session.finish}
        </Button>
      </div>

      {exercises.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t.training.session.emptyWorkout}
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
          await saveNow();
          await finishWorkout({ workoutId: session.id, perceivedEffort: effort });
        }}
      />
    </div>
  );
}

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
                try {
                  useSession.persist.clearStorage();
                } catch {
                  /* noop */
                }
                await onFinish(effort);
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
