'use client';

/**
 * Las piezas de la pantalla de entrenamiento que comparten la web y la app independiente, para que se vean y se usen
 * igual. No saben nada de la web ni del servidor: reciben datos y avisan lo que se tocó.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { DecimalInput } from '@/components/form/decimal-input';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/i18n';

/** Una serie como la muestra y edita la pantalla. */
export interface SetRowData {
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  isWarmup: boolean;
  isCompleted: boolean;
}

export function elapsedStr(fromMs: number | null, now: number): string {
  if (!fromMs) return '0:00';
  const s = Math.max(0, Math.floor((now - fromMs) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

export function Countdown({ label, onDone }: { label: string; onDone: () => void }) {
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

/** Columnas de la grilla de series: número, dos campos, tilde y borrar. */
export const SET_GRID = 'grid-cols-[2.25rem_1fr_1fr_3rem_1.25rem]';

export function SetRow({
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
  set: SetRowData;
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
