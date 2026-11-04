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
  compact = false,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  className?: string;
  /** Botones y número más chicos, para filas con varios campos en pantallas angostas. */
  compact?: boolean;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className={cn('inline-flex items-center rounded-lg border', className)}>
      <button
        type="button"
        aria-label="Restar"
        onClick={() => onChange(clamp(Math.round((value - step) * 100) / 100))}
        disabled={value <= min}
        className={cn('grid shrink-0 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40', compact ? 'size-9' : 'size-10')}
      >
        <Minus className="size-4" />
      </button>
      <span className={cn('text-center text-sm font-semibold tabular-nums', compact ? 'min-w-9' : 'min-w-16')}>
        {value}
        {suffix ? <span className="ml-0.5 text-xs font-normal text-muted-foreground">{suffix}</span> : null}
      </span>
      <button
        type="button"
        aria-label="Sumar"
        onClick={() => onChange(clamp(Math.round((value + step) * 100) / 100))}
        disabled={value >= max}
        className={cn('grid shrink-0 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40', compact ? 'size-9' : 'size-10')}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
