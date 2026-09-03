'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Entrada numérica con botones −/+ (buena para móvil, sin teclado). */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  className?: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className={cn('inline-flex items-center rounded-lg border', className)}>
      <button
        type="button"
        aria-label="Restar"
        onClick={() => onChange(clamp(Math.round((value - step) * 100) / 100))}
        disabled={value <= min}
        className="grid size-10 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-16 text-center text-sm font-semibold tabular-nums">
        {value}
        {suffix ? <span className="ml-0.5 text-xs font-normal text-muted-foreground">{suffix}</span> : null}
      </span>
      <button
        type="button"
        aria-label="Sumar"
        onClick={() => onChange(clamp(Math.round((value + step) * 100) / 100))}
        disabled={value >= max}
        className="grid size-10 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
