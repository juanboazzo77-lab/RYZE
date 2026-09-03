'use client';

import * as RadioGroup from '@radix-ui/react-radio-group';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/** Selección única en tarjetas grandes (buena para móvil). */
export function OptionCards<T extends string>({
  options,
  value,
  onChange,
  name,
  columns = 1,
}: {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  name?: string;
  columns?: 1 | 2;
}) {
  return (
    <RadioGroup.Root
      name={name}
      value={value ?? undefined}
      onValueChange={(v) => onChange(v as T)}
      className={cn('grid gap-2', columns === 2 && 'sm:grid-cols-2')}
    >
      {options.map((opt) => (
        <RadioGroup.Item
          key={opt.value}
          value={opt.value}
          className={cn(
            'group flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
            'hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'data-[state=checked]:border-primary data-[state=checked]:bg-accent',
          )}
        >
          <span
            className={cn(
              'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border',
              'group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary group-data-[state=checked]:text-primary-foreground',
            )}
          >
            <Check className="size-3 opacity-0 group-data-[state=checked]:opacity-100" />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-medium">{opt.label}</span>
            {opt.hint ? (
              <span className="text-xs text-muted-foreground">{opt.hint}</span>
            ) : null}
          </span>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
