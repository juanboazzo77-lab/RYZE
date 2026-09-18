'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import type { UnitSystem } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';
import { displayWeight, weightUnitLabel } from '@/lib/units';
import { weekStartISO, localTodayISO, addDaysISO } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { WeightEntryDTO } from './queries';
import { LogWeightDialog } from './log-weight-dialog';
import { deleteWeightEntry } from './actions';

function weekHref(range: string, weekKey: string): string {
  const params = new URLSearchParams();
  if (range !== '30') params.set('range', range);
  params.set('week', weekKey);
  return `/progress?${params.toString()}`;
}

export function EntryList({
  entries,
  todayISO,
  unitSystem,
  weekStart,
  timezone,
  week,
  range,
}: {
  entries: WeightEntryDTO[];
  todayISO: string;
  unitSystem: UnitSystem;
  weekStart: number;
  timezone: string;
  /** Semana seleccionada (lunes/domingo según `weekStart`), yyyy-mm-dd. */
  week: string;
  range: string;
}) {
  const { locale, t } = useI18n();
  const unit = weightUnitLabel(unitSystem);
  const [pending, start] = useTransition();

  // `entries` viene ordenado desc (más nuevo primero) con el historial
  // completo; se filtra a la semana seleccionada manteniendo el índice
  // original para que el delta siga comparando contra el registro
  // cronológico anterior (aunque sea de la semana previa).
  const currentWeekKey = weekStartISO(localTodayISO(timezone), weekStart);
  const prevWeekKey = addDaysISO(week, -7);
  const nextWeekKey = addDaysISO(week, 7);
  const canGoNext = nextWeekKey <= currentWeekKey;

  const weekStartDt = DateTime.fromISO(week, { zone: 'utc' }).setLocale(locale);
  const weekEndDt = weekStartDt.plus({ days: 6 });
  const sameMonth = weekStartDt.month === weekEndDt.month;
  const weekLabel =
    week === currentWeekKey
      ? t.progress.thisWeek
      : `${weekStartDt.toFormat('d')}${sameMonth ? '' : ` ${weekStartDt.toFormat('LLL')}`} – ${weekEndDt.toFormat('d LLL')}`;

  const rows = entries
    .map((e, idx) => ({ e, idx }))
    .filter(({ e }) => weekStartISO(e.date, weekStart) === week);

  return (
    <div>
      <div className="flex items-center justify-between pb-2">
        <Button variant="ghost" size="icon" className="size-8" aria-label={t.progress.prevWeek} asChild>
          <Link href={weekHref(range, prevWeekKey)}>
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {weekLabel}
          </p>
          {week !== currentWeekKey ? (
            <Link
              href={weekHref(range, currentWeekKey)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t.progress.backToThisWeek}
            </Link>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={t.progress.nextWeek}
          disabled={!canGoNext}
          asChild={canGoNext}
        >
          {canGoNext ? (
            <Link href={weekHref(range, nextWeekKey)}>
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <ChevronRight className="size-4" />
          )}
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{t.progress.noEntries}</p>
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{t.progress.noEntriesWeek}</p>
      ) : (
        <div className="divide-y">
          {rows.map(({ e, idx }) => {
            const prev = entries[idx + 1];
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
                    {DateTime.fromISO(e.date, { zone: 'utc' })
                      .setLocale(locale)
                      .toFormat('ccc d LLL')}
                  </p>
                  {e.note ? <p className="truncate text-xs text-muted-foreground">{e.note}</p> : null}
                </div>
                {dDelta != null && dDelta !== 0 ? (
                  <span
                    className={cn('text-xs tabular-nums', dDelta < 0 ? 'text-success' : 'text-warning')}
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
      )}
    </div>
  );
}
