'use client';

import { cn } from '@/lib/utils';

/** Control segmentado en línea para 2-4 opciones cortas. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  wrap = false,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
  /** Permite que las opciones pasen a otra línea (opciones largas o más de 4). */
  wrap?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'inline-flex w-full rounded-lg border bg-secondary p-1',
        wrap && 'flex-wrap gap-1',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              wrap && 'whitespace-nowrap',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
