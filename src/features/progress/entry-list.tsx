'use client';

import { useTransition } from 'react';
import { DateTime } from 'luxon';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import type { UnitSystem } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';
import { displayWeight, weightUnitLabel } from '@/lib/units';
import { cn } from '@/lib/utils';
import type { WeightEntryDTO } from './queries';
import { LogWeightDialog } from './log-weight-dialog';
import { deleteWeightEntry } from './actions';

export function EntryList({
  entries,
  todayISO,
  unitSystem,
}: {
  entries: WeightEntryDTO[];
  todayISO: string;
  unitSystem: UnitSystem;
}) {
  const { locale, t } = useI18n();
  const unit = weightUnitLabel(unitSystem);
  const [pending, start] = useTransition();

  if (entries.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">{t.progress.noEntries}</p>;
  }

  return (
    <div className="divide-y">
      {entries.map((e, i) => {
        const prev = entries[i + 1];
        const deltaKg = prev ? Math.round((e.weightKg - prev.weightKg) * 10) / 10 : null;
        const w = displayWeight(e.weightKg, unitSystem);
        const dDelta =
          deltaKg != null
            ? Math.round((unitSystem === 'IMPERIAL' ? deltaKg / 0.45359237 : deltaKg) * 10) / 10
            : null;
        return (
          <div key={e.id} className={cn('flex items-center gap-3 py-2.5', pending && 'opacity-60')}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {DateTime.fromISO(e.date, { zone: 'utc' }).setLocale(locale).toFormat('ccc d LLL')}
              </p>
              {e.note ? <p className="truncate text-xs text-muted-foreground">{e.note}</p> : null}
            </div>
            {dDelta != null && dDelta !== 0 ? (
              <span
                className={cn(
                  'text-xs tabular-nums',
                  dDelta < 0 ? 'text-success' : 'text-warning',
                )}
              >
                {dDelta > 0 ? '+' : ''}
                {dDelta}
              </span>
            ) : null}
            <span className="w-20 text-right text-sm font-semibold tabular-nums">
              {w.value} {unit}
            </span>
            <LogWeightDialog
              todayISO={todayISO}
              unitSystem={unitSystem}
              defaultDate={e.date}
              defaultKg={e.weightKg}
              defaultNote={e.note}
              trigger={
                <Button variant="ghost" size="icon" className="size-8" aria-label={t.common.edit}>
                  <Pencil className="size-3.5" />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={t.common.delete}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteWeightEntry({ id: e.id });
                  if (res.ok) toast.success(t.progress.deleted);
                  else toast.error(t.progress.genericError);
                })
              }
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
