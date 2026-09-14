'use client';

import { useTransition } from 'react';
import { DateTime } from 'luxon';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import type { UnitSystem } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';
import { displayWeight, weightUnitLabel } from '@/lib/units';
import { weekStartISO, localTodayISO } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { WeightEntryDTO } from './queries';
import { LogWeightDialog } from './log-weight-dialog';
import { deleteWeightEntry } from './actions';

export function EntryList({
  entries,
  todayISO,
  unitSystem,
  weekStart,
  timezone,
}: {
  entries: WeightEntryDTO[];
  todayISO: string;
  unitSystem: UnitSystem;
  weekStart: number;
  timezone: string;
}) {
  const { locale, t } = useI18n();
  const unit = weightUnitLabel(unitSystem);
  const [pending, start] = useTransition();

  if (entries.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">{t.progress.noEntries}</p>;
  }

  // `entries` viene ordenado desc (más nuevo primero). Se agrupa por semana
  // calendario (según `weekStart` del perfil) manteniendo el índice original
  // para que el delta siga comparando contra el registro cronológico anterior.
  const currentWeekKey = weekStartISO(localTodayISO(timezone), weekStart);
  const groups: Array<{ key: string; label: string; rows: Array<{ e: WeightEntryDTO; idx: number }> }> = [];
  entries.forEach((e, idx) => {
    const key = weekStartISO(e.date, weekStart);
    let group = groups.at(-1);
    if (!group || group.key !== key) {
      const start = DateTime.fromISO(key, { zone: 'utc' }).setLocale(locale);
      const end = start.plus({ days: 6 });
      const sameMonth = start.month === end.month;
      const label =
        key === currentWeekKey
          ? t.progress.thisWeek
          : `${start.toFormat('d')}${sameMonth ? '' : ` ${start.toFormat('LLL')}`} – ${end.toFormat('d LLL')}`;
      group = { key, label, rows: [] };
      groups.push(group);
    }
    group.rows.push({ e, idx });
  });

  return (
    <div className="divide-y">
      {groups.map((group) => (
        <div key={group.key} className="py-1">
          <p className="px-0.5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          <div className="divide-y">
            {group.rows.map(({ e, idx }) => {
              const prev = entries[idx + 1];
              const deltaKg = prev ? Math.round((e.weightKg - prev.weightKg) * 10) / 10 : null;
              const w = displayWeight(e.weightKg, unitSystem);
              const dDelta =
                deltaKg != null
                  ? Math.round((unitSystem === 'IMPERIAL' ? deltaKg / 0.45359237 : deltaKg) * 10) / 10
                  : null;
              return (
                <div
                  key={e.id}
                  className={cn('flex items-center gap-3 py-2.5', pending && 'opacity-60')}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {DateTime.fromISO(e.date, { zone: 'utc' })
                        .setLocale(locale)
                        .toFormat('ccc d LLL')}
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
        </div>
      ))}
    </div>
  );
}
