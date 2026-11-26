'use client';

import { DateTime } from 'luxon';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';

/** Las flechas para cambiar de día. Las usan la web y la app. */
export function DayNavBar({
  dateISO,
  todayISO,
  minISO,
  onGo,
}: {
  dateISO: string;
  todayISO: string;
  /** El día más viejo al que se puede ir (la app sólo guarda los últimos). */
  minISO?: string;
  onGo: (iso: string) => void;
}) {
  const { t, locale } = useI18n();

  const shift = (n: number) =>
    onGo(DateTime.fromISO(dateISO, { zone: 'utc' }).plus({ days: n }).toISODate()!);

  const yesterdayISO = DateTime.fromISO(todayISO, { zone: 'utc' }).minus({ days: 1 }).toISODate()!;
  const label =
    dateISO === todayISO
      ? t.nutrition.today
      : dateISO === yesterdayISO
        ? t.nutrition.yesterday
        : DateTime.fromISO(dateISO, { zone: 'utc' }).setLocale(locale).toFormat('ccc d LLL');

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        size="icon"
        aria-label={t.nutrition.prevDay}
        disabled={minISO !== undefined && dateISO <= minISO}
        onClick={() => shift(-1)}
      >
        <ChevronLeft className="size-5" />
      </Button>
      <button
        type="button"
        onClick={() => onGo(todayISO)}
        className="text-base font-semibold capitalize tabular-nums"
      >
        {label}
      </button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t.nutrition.nextDay}
        disabled={dateISO >= todayISO}
        onClick={() => shift(1)}
      >
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}
