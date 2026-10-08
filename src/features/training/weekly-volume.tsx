'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { VolumeRow } from '@/lib/training/volume';

/** Series semanales por grupo muscular: cuántas como principal y cuántas como secundario. */
export function WeeklyVolume({ rows }: { rows: VolumeRow[] }) {
  const t = useT();
  const tv = t.training.volume;
  const [open, setOpen] = useState(true);
  const max = Math.max(1, ...rows.map((r) => r.primarySets + r.secondarySets));

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="text-base font-semibold">{tv.title}</span>
          <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>

        {open ? (
          rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tv.empty}</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{tv.hint}</p>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-primary" />
                  {tv.primary}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-primary/35" />
                  {tv.secondary}
                </span>
              </div>
              <ul className="space-y-2.5">
                {rows.map((r) => (
                  <li key={r.muscle}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">{t.training.muscles[r.muscle]}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        <span className="font-semibold text-foreground">{r.primarySets}</span> {tv.primary}
                        {r.primaryExercises > 0 ? ` (${r.primaryExercises} ${tv.exShort})` : ''}
                        {r.secondarySets > 0 ? (
                          <>
                            {' · '}
                            <span className="font-semibold text-foreground">{r.secondarySets}</span> {tv.secondary}
                            {` (${r.secondaryExercises} ${tv.exShort})`}
                          </>
                        ) : null}
                      </span>
                    </div>
                    <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="bg-primary" style={{ width: `${(r.primarySets / max) * 100}%` }} />
                      <div className="bg-primary/35" style={{ width: `${(r.secondarySets / max) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
