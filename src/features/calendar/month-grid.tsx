'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { CalendarCheck, Dumbbell, Scale, UtensilsCrossed } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { displayWeight, weightUnitLabel } from '@/lib/units';
import type { UnitSystem } from '@prisma/client';
import type { CalendarDay, CalendarMonth } from './queries';
import type { Dictionary, Locale } from '@/i18n';

const STATUS_DOT: Record<string, string> = {
  COMPLETED: 'bg-success',
  ACTIVE: 'bg-primary',
  PENDING: 'bg-muted-foreground',
  SKIPPED: 'bg-destructive/60',
};

export function MonthGrid({ month, unitSystem }: { month: CalendarMonth; unitSystem: UnitSystem }) {
  const { t, locale } = useI18n();
  const todayISO = DateTime.now().toISODate()!;
  const [selected, setSelected] = useState<string>(
    month.days.some((d) => d.dateISO === todayISO) ? todayISO : (month.days[0]?.dateISO ?? todayISO),
  );

  const day = month.days.find((d) => d.dateISO === selected) ?? null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {t.calendar.weekdaysShort.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: month.leadingBlanks }).map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {month.days.map((d) => {
          const dt = DateTime.fromISO(d.dateISO, { zone: 'utc' }).setLocale(locale);
          const dayNum = dt.day;
          const isToday = d.dateISO === todayISO;
          const isSelected = d.dateISO === selected;
          const nutritionRatio =
            d.nutrition && d.nutrition.targetKcal ? d.nutrition.kcal / d.nutrition.targetKcal : null;
          return (
            <button
              key={d.dateISO}
              type="button"
              onClick={() => setSelected(d.dateISO)}
              aria-pressed={isSelected}
              aria-label={dt.toFormat('cccc d LLLL')}
              className={cn(
                'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-xs transition-colors',
                isSelected ? 'border-primary bg-accent' : 'hover:bg-secondary/50',
                isToday && !isSelected && 'border-primary/50',
              )}
            >
              <span className={cn('tabular-nums', isToday && 'font-bold text-primary')}>{dayNum}</span>
              <span className="flex h-1.5 items-center gap-0.5">
                {d.workout ? (
                  <span className={cn('size-1.5 rounded-full', STATUS_DOT[d.workout.status])} />
                ) : null}
                {d.weightKg !== null ? <span className="size-1.5 rounded-full bg-chart-protein" /> : null}
                {nutritionRatio !== null ? (
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      nutritionRatio > 1.15 || nutritionRatio < 0.7 ? 'bg-warning' : 'bg-chart-kcal',
                    )}
                  />
                ) : null}
                {d.checkinId ? <span className="size-1.5 rounded-full bg-warning" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      {day ? <DayDetail dateISO={day.dateISO} day={day} unitSystem={unitSystem} t={t} locale={locale} /> : null}
    </div>
  );
}

function DayDetail({
  dateISO,
  day: d,
  unitSystem: us,
  t,
  locale,
}: {
  dateISO: string;
  day: CalendarDay;
  unitSystem: UnitSystem;
  t: Dictionary;
  locale: Locale;
}) {
  const hasAny = d.workout || d.weightKg !== null || d.nutrition || d.checkinId;
  const w = d.weightKg !== null ? displayWeight(d.weightKg, us) : null;
  const unit = weightUnitLabel(us);

  return (
    <div className="rounded-xl border p-3">
      <p className="mb-2 text-sm font-semibold capitalize">
        {DateTime.fromISO(dateISO, { zone: 'utc' }).setLocale(locale).toFormat('cccc d LLLL')}
      </p>
      {!hasAny ? (
        <p className="text-sm text-muted-foreground">{t.calendar.noRecords}</p>
      ) : (
        <div className="space-y-2 text-sm">
          {d.workout ? (
            <Link
              href={
                d.workout.status === 'COMPLETED'
                  ? `/training/workouts/${d.workout.id}`
                  : d.workout.status === 'ACTIVE'
                    ? `/training/session/${d.workout.id}`
                    : '/training'
              }
              className="flex items-center justify-between gap-2 rounded-md hover:bg-secondary/50 hover:underline"
            >
              <span className="flex items-center gap-2">
                <Dumbbell className="size-4 text-primary" />
                {d.workout.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {d.workout.status === 'COMPLETED'
                  ? t.calendar.statusCompleted
                  : d.workout.status === 'ACTIVE'
                    ? t.calendar.statusActive
                    : d.workout.status === 'SKIPPED'
                      ? t.calendar.statusSkipped
                      : t.calendar.statusPlanned}
              </span>
            </Link>
          ) : null}
          {w ? (
            <div className="flex items-center gap-2">
              <Scale className="size-4 text-chart-protein" />
              {t.calendar.weight}: {w.value} {unit}
            </div>
          ) : null}
          {d.nutrition ? (
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="size-4 text-chart-kcal" />
              {t.calendar.nutrition}: {d.nutrition.kcal}
              {d.nutrition.targetKcal ? ` / ${d.nutrition.targetKcal}` : ''} kcal
            </div>
          ) : null}
          {d.checkinId ? (
            <Link
              href="/checkin"
              className="flex items-center gap-2 rounded-md hover:bg-secondary/50 hover:underline"
            >
              <CalendarCheck className="size-4 text-warning" />
              {t.calendar.viewCheckin}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
