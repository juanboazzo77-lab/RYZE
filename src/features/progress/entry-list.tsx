'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import type { UnitSystem } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';
import { weekStartISO, localTodayISO } from '@/lib/date';
import type { WeightEntryDTO } from './queries';
import { LogWeightDialog } from './log-weight-dialog';
import { WeightWeekList } from './weight-week-list';
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
  const { t } = useI18n();
  const [pending, start] = useTransition();

  return (
    <WeightWeekList
      entries={entries}
      week={week}
      currentWeekKey={weekStartISO(localTodayISO(timezone), weekStart)}
      weekStart={weekStart}
      unitSystem={unitSystem}
      dimmed={pending}
      weekControl={(to, content, { kind, label }) =>
        kind === 'current' ? (
          <Link href={weekHref(range, to)} className="text-xs font-medium text-primary hover:underline">
            {content}
          </Link>
        ) : (
          <Button variant="ghost" size="icon" className="size-8" aria-label={label} asChild>
            <Link href={weekHref(range, to)}>{content}</Link>
          </Button>
        )
      }
      actions={(e) => (
        <>
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
        </>
      )}
    />
  );
}
