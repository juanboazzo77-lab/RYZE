import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, CalendarRange, Camera, ClipboardCheck, Flame, Trophy, Users } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { rangeToDays } from '@/lib/progress/weight';
import { localTodayISO, weekStartISO } from '@/lib/date';
import { weightUnitLabel } from '@/lib/units';
import { getWeightPage } from '@/features/progress/queries';
import { getActivity } from '@/features/activity/queries';
import { WeightChart } from '@/features/progress/weight-chart';
import { WEIGHT_RANGES as RANGES, WeightHeadline, WeightTrend } from '@/features/progress/weight-stats';
import { LogWeightDialog } from '@/features/progress/log-weight-dialog';
import { EntryList } from '@/features/progress/entry-list';
import { ActivitySection } from '@/features/activity/activity-section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Progreso' };

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; week?: string }>;
}) {
  const [{ t }, ctx, sp] = await Promise.all([getT(), requireUser(), searchParams]);
  const rangeParam = sp.range ?? '30';
  const range = RANGES.includes(rangeParam as (typeof RANGES)[number]) ? rangeParam : '30';
  const currentWeekKey = weekStartISO(localTodayISO(ctx.profile.timezone), ctx.profile.weekStart);
  const week = sp.week && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? sp.week : currentWeekKey;
  // Secuencial: connection_limit=1.
  const data = await getWeightPage(ctx.profile, rangeToDays(range));
  const activity = await getActivity(ctx.profile);

  const us = ctx.profile.unitSystem;
  const unit = weightUnitLabel(us);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t.progress.title}</h1>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Link
          href="/progress/stats"
          className="flex flex-col items-center gap-1 rounded-lg border bg-card p-3 text-center text-xs font-medium hover:bg-secondary/50"
        >
          <BarChart3 className="size-4 text-primary" />
          {t.stats.title}
        </Link>
        <Link
          href="/progress/consistency"
          className="flex flex-col items-center gap-1 rounded-lg border bg-card p-3 text-center text-xs font-medium hover:bg-secondary/50"
        >
          <Flame className="size-4 text-primary" />
          {t.consistency.title}
        </Link>
        <Link
          href="/progress/achievements"
          className="flex flex-col items-center gap-1 rounded-lg border bg-card p-3 text-center text-xs font-medium hover:bg-secondary/50"
        >
          <Trophy className="size-4 text-warning" />
          {t.gamification.title}
        </Link>
        <Link
          href="/checkin"
          className="flex flex-col items-center gap-1 rounded-lg border bg-card p-3 text-center text-xs font-medium hover:bg-secondary/50"
        >
          <ClipboardCheck className="size-4 text-primary" />
          {t.checkin.title}
        </Link>
        <Link
          href="/progress/photos"
          className="flex flex-col items-center gap-1 rounded-lg border bg-card p-3 text-center text-xs font-medium hover:bg-secondary/50"
        >
          <Camera className="size-4 text-primary" />
          {t.progress.photosTitle}
        </Link>
        <Link
          href="/progress/friends"
          className="flex flex-col items-center gap-1 rounded-lg border bg-card p-3 text-center text-xs font-medium hover:bg-secondary/50"
        >
          <Users className="size-4 text-primary" />
          {t.friends.title}
        </Link>
        <Link
          href="/progress/report"
          className="flex flex-col items-center gap-1 rounded-lg border bg-card p-3 text-center text-xs font-medium hover:bg-secondary/50"
        >
          <CalendarRange className="size-4 text-primary" />
          {t.report.title}
        </Link>
      </div>

      <WeightHeadline t={t} summary={data} unitSystem={us} />

      <LogWeightDialog todayISO={data.todayISO} unitSystem={us} />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">{t.progress.title}</CardTitle>
            <div className="flex rounded-lg border bg-secondary p-0.5 text-xs">
              {RANGES.map((r) => (
                <Link
                  key={r}
                  href={r === '30' ? '/progress' : `/progress?range=${r}`}
                  className={cn(
                    'rounded-md px-2 py-1 font-medium transition-colors',
                    range === r
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.progress.range[r]}
                </Link>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <WeightChart data={data.chart} targetKg={data.targetKg} unitLabel={unit} />
        </CardContent>
      </Card>

      <WeightTrend t={t} summary={data} unitSystem={us} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.progress.entries}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <EntryList
            entries={data.entries}
            todayISO={data.todayISO}
            unitSystem={us}
            weekStart={ctx.profile.weekStart}
            timezone={ctx.profile.timezone}
            week={week}
            range={range}
          />
        </CardContent>
      </Card>

      <ActivitySection data={activity} />
    </div>
  );
}
