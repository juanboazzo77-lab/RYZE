import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, Trophy } from 'lucide-react';
import { DateTime } from 'luxon';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { interpolate } from '@/i18n';
import { can } from '@/server/entitlements';
import { getStatsPage } from '@/features/stats/queries';
import { ProgressLineChart } from '@/components/charts/progress-line-chart';
import { UpsellCard } from '@/components/upsell-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'Estadísticas' };

export default async function StatsPage() {
  const [{ t, locale }, ctx] = await Promise.all([getT(), requireUser()]);

  const header = (
    <>
      <Link
        href="/progress"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t.progress.title}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{t.stats.title}</h1>
    </>
  );

  if (!can(ctx.entitlement, 'advanced_stats')) {
    return (
      <div className="space-y-4">
        {header}
        <UpsellCard t={t} description={t.pro.statsDesc} />
      </div>
    );
  }

  const data = await getStatsPage(ctx.profile, 8);
  const maxWorkouts = Math.max(1, ...data.weeks.map((w) => w.workouts));

  return (
    <div className="space-y-4">
      {header}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.stats.weeklyWorkouts}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-24 items-end gap-2">
            {data.weeks.map((w) => (
              <div key={w.weekStartISO} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary transition-all"
                  style={{ height: `${Math.max(4, (w.workouts / maxWorkouts) * 100)}%` }}
                  title={`${w.workouts}`}
                />
                <span className="text-[10px] text-muted-foreground">{w.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.stats.weeklyVolume}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressLineChart
            data={data.weeks.map((w) => ({ label: w.label, value: w.volume }))}
            unit="kg"
            color="var(--chart-protein)"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.stats.nutritionAvg}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold tabular-nums">{data.avgKcal ?? t.stats.noData}</p>
            <p className="text-[11px] text-muted-foreground">{t.stats.avgKcal}</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">{data.avgProtein ?? t.stats.noData}</p>
            <p className="text-[11px] text-muted-foreground">{t.stats.avgProtein}</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">
              {data.adherencePct === null ? t.stats.noData : `${data.adherencePct}%`}
            </p>
            <p className="text-[11px] text-muted-foreground">{t.stats.adherence}</p>
          </div>
        </CardContent>
        <CardContent className="pt-0 text-center text-xs text-muted-foreground">
          {interpolate(t.stats.loggedDays, { n: data.loggedDays })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.stats.recentPrs}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {data.recentPrs.length === 0 ? (
            <EmptyState compact title={t.stats.noPrs} />
          ) : (
            <div className="divide-y">
              {data.recentPrs.map((pr) => (
                <Link
                  key={pr.id}
                  href={`/training/exercises/${pr.exerciseId}`}
                  className="flex items-center justify-between gap-3 py-2 hover:bg-secondary/40"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Trophy className="size-3.5 text-warning" />
                    {pr.exerciseName}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t.training.pr[pr.type as 'MAX_WEIGHT']} · {pr.value} {pr.unit} ·{' '}
                    {DateTime.fromJSDate(pr.achievedAt).setLocale(locale).toFormat('d LLL')}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
