'use client';

import { DateTime } from 'luxon';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { addDaysISO, weekStartISO } from '@/lib/date';
import { displayWeight, weightUnitLabel } from '@/lib/units';
import { cn } from '@/lib/utils';

export interface WeekListEntry {
  date: string;
  weightKg: number;
  note: string | null;
}

/**
 * Los registros de peso, de a una semana, con la diferencia contra el registro anterior. La usan la web y la app: cada
 * una arma sus botones para cambiar de semana (en la web son enlaces) y los de cada fila.
 */
export function WeightWeekList<T extends WeekListEntry>({
  entries,
  week,
  currentWeekKey,
  weekStart,
  unitSystem,
  dimmed,
  weekControl,
  badge,
  actions,
}: {
  /** Todo el historial, del más nuevo al más viejo. */
  entries: T[];
  /** Primer día de la semana elegida, yyyy-mm-dd. */
  week: string;
  currentWeekKey: string;
  weekStart: number;
  unitSystem: 'METRIC' | 'IMPERIAL';
  dimmed?: boolean;
  /** Un control que lleva a otra semana: las flechas y "volver a esta semana". */
  weekControl: (to: string, content: React.ReactNode, options: { kind: 'prev' | 'next' | 'current'; label?: string }) => React.ReactNode;
  badge?: (entry: T) => React.ReactNode;
  actions: (entry: T) => React.ReactNode;
}) {
  const { locale, t } = useI18n();
  const unit = weightUnitLabel(unitSystem);
  const canGoNext = addDaysISO(week, 7) <= currentWeekKey;

  const weekStartDt = DateTime.fromISO(week, { zone: 'utc' }).setLocale(locale);
  const weekEndDt = weekStartDt.plus({ days: 6 });
  const sameMonth = weekStartDt.month === weekEndDt.month;
  const weekLabel =
    week === currentWeekKey
      ? t.progress.thisWeek
      : `${weekStartDt.toFormat('d')}${sameMonth ? '' : ` ${weekStartDt.toFormat('LLL')}`} – ${weekEndDt.toFormat('d LLL')}`;

  // Se filtra la semana conservando el índice original: la diferencia se compara con el registro anterior, aunque sea de
  // la semana previa.
  const rows = entries.map((e, idx) => ({ e, idx })).filter(({ e }) => weekStartISO(e.date, weekStart) === week);

  return (
    <div>
      <div className="flex items-center justify-between pb-2">
        {weekControl(addDaysISO(week, -7), <ChevronLeft className="size-4" />, { kind: 'prev', label: t.progress.prevWeek })}
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{weekLabel}</p>
          {week !== currentWeekKey ? weekControl(currentWeekKey, t.progress.backToThisWeek, { kind: 'current' }) : null}
        </div>
        {canGoNext ? (
          weekControl(addDaysISO(week, 7), <ChevronRight className="size-4" />, { kind: 'next', label: t.progress.nextWeek })
        ) : (
          <span aria-hidden className="grid size-8 place-items-center opacity-50">
            <ChevronRight className="size-4" />
          </span>
        )}
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
              deltaKg != null ? Math.round((unitSystem === 'IMPERIAL' ? deltaKg / 0.45359237 : deltaKg) * 10) / 10 : null;
            return (
              <div key={e.date} className={cn('flex items-center gap-3 py-2.5', dimmed && 'opacity-60')}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {DateTime.fromISO(e.date, { zone: 'utc' }).setLocale(locale).toFormat('ccc d LLL')}
                  </p>
                  {e.note ? <p className="truncate text-xs text-muted-foreground">{e.note}</p> : null}
                  {badge?.(e)}
                </div>
                {dDelta != null && dDelta !== 0 ? (
                  <span className={cn('text-xs tabular-nums', dDelta < 0 ? 'text-success' : 'text-warning')}>
                    {dDelta > 0 ? '+' : ''}
                    {dDelta}
                  </span>
                ) : null}
                <span className="w-20 text-right text-sm font-semibold tabular-nums">
                  {w.value} {unit}
                </span>
                {actions(e)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
