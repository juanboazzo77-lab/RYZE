import Link from 'next/link';
import { DateTime } from 'luxon';
import { ChevronLeft, Flame } from 'lucide-react';
import type { Dictionary } from '@/i18n';
import { interpolate } from '@/i18n';
import type { ConsistencyView } from './queries';
import { DotCalendar } from './dot-calendar';
import { ConsistencyShare } from './consistency-share';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

/** La pantalla de constancia (calendario de puntos). Se usa en la app y en la vista de ejemplo de desarrollo. */
export function ConsistencyScreen({
  t,
  locale,
  view,
  firstName,
}: {
  t: Dictionary;
  locale: string;
  view: ConsistencyView;
  firstName: string;
}) {
  const c = t.consistency;
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    DateTime.fromObject({ year: 2026, month: i + 1, day: 1 }, { zone: 'utc' }).setLocale(locale).toFormat('LLL'),
  );
  const thisYear = view.years[0];

  return (
    <div className="space-y-4">
      <Link
        href="/progress"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t.nav.progress}
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{c.title}</h1>
          <p className="text-sm text-muted-foreground">{c.subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-primary">
          <Flame className="size-5" />
          <span className="text-xl font-bold tabular-nums">{view.streak}</span>
        </div>
      </div>

      {view.totalDays === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <EmptyState compact illustration="workout" title={c.empty} />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl border bg-card p-3">
              <p className="text-2xl font-bold tabular-nums">{view.longest}</p>
              <p className="text-xs text-muted-foreground">{c.longest}</p>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <p className="text-2xl font-bold tabular-nums">{view.totalDays}</p>
              <p className="text-xs text-muted-foreground">{c.total}</p>
            </div>
          </div>

          {view.years.map((g) => (
            <Card key={g.year}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-bold tabular-nums">{g.year}</h2>
                  <span className="text-xs text-muted-foreground">
                    {interpolate(c.trainedYear, { n: g.trainedDays })}
                  </span>
                </div>
                <DotCalendar grid={g} monthNames={monthNames} />
              </CardContent>
            </Card>
          ))}

          <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-foreground/15" />
              {c.rest}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-primary" />
              {c.training}
            </span>
          </div>

          <div className="pt-2">
            <h2 className="mb-3 text-center text-sm font-semibold">{c.shareTitle}</h2>
            <ConsistencyShare
              name={firstName}
              streak={view.streak}
              years={view.years}
              monthNames={monthNames}
              labels={{
                title: c.shareCardTitle,
                streak: interpolate(c.streakDays, { n: view.streak }),
                trained: c.trainedYear,
                rest: c.rest,
                training: c.training,
              }}
              shareText={interpolate(c.shareText, { n: thisYear?.trainedDays ?? 0 })}
            />
          </div>
        </>
      )}
    </div>
  );
}
