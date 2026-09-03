'use client';

import { useRouter } from 'next/navigation';
import { DateTime } from 'luxon';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';

export function DayNav({ dateISO, todayISO }: { dateISO: string; todayISO: string }) {
  const router = useRouter();
  const { t, locale } = useI18n();

  const go = (iso: string) => router.push(iso === todayISO ? '/nutrition' : `/nutrition?date=${iso}`);
  const shift = (n: number) =>
    go(DateTime.fromISO(dateISO, { zone: 'utc' }).plus({ days: n }).toISODate()!);

  const yesterdayISO = DateTime.fromISO(todayISO, { zone: 'utc' }).minus({ days: 1 }).toISODate()!;
  const label =
    dateISO === todayISO
      ? t.nutrition.today
      : dateISO === yesterdayISO
        ? t.nutrition.yesterday
        : DateTime.fromISO(dateISO, { zone: 'utc' }).setLocale(locale).toFormat('ccc d LLL');

  return (
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="icon" aria-label={t.nutrition.prevDay} onClick={() => shift(-1)}>
        <ChevronLeft className="size-5" />
      </Button>
      <button
        onClick={() => go(todayISO)}
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
