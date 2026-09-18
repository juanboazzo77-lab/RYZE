import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, ClipboardCheck, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { rangeToDays } from '@/lib/progress/weight';
import { localTodayISO, weekStartISO } from '@/lib/date';
import { displayWeight, weightUnitLabel } from '@/lib/units';
import { getWeightPage } from '@/features/progress/queries';
import { getActivity } from '@/features/activity/queries';
import { WeightChart } from '@/features/progress/weight-chart';
import { LogWeightDialog } from '@/features/progress/log-weight-dialog';
import { EntryList } from '@/features/progress/entry-list';
import { ActivitySection } from '@/features/activity/activity-section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Progreso' };

const RANGES = ['7', '30', '90', '180', '365', 'all'] as const;

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
  const d = (kg: number | null) => (kg === null ? '—' : displayWeight(kg, us).value);
  const dDelta = (kg: number | null) =>
    kg === null ? null : Math.round((us === 'IMPERIAL' ? kg / 0.45359237 : kg) * 10) / 10;

  const toGoalKg =
    data.currentKg !== null && data.targetKg !== null ? data.targetKg - data.currentKg : null;

  const trendLabel = data.stats.trend
    ? data.stats.trend.direction === 'down'
      ? t.progress.trendDown
      : data.stats.trend.direction === 'up'
        ? t.progress.trendUp
        : t.progress.trendFlat
    : '—';

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t.progress.title}</h1>

      <div className="grid grid-cols-3 gap-2">
        <Link
          href="/progress/stats"
          className="flex flex-col items-center gap-1 rounded-lg border bg-card p-3 text-center text-xs font-medium hover:bg-secondary/50"
        >
          <BarChart3 className="size-4 text-primary" />
          {t.stats.title}
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
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t.progress.current} value={`${d(data.currentKg)} ${unit}`} big />
        <Stat label={t.progress.start} value={`${d(data.startKg)} ${unit}`} />
        <Stat label={t.progress.target} value={data.targetKg === null ? '—' : `${d(data.targetKg)} ${unit}`} />
        <Stat
          label={t.progress.totalChange}
          value={
            data.totalChangeKg === null
              ? '—'
              : `${data.totalChangeKg > 0 ? '+' : ''}${dDelta(data.totalChangeKg)} ${unit}`
          }
          tone={data.totalChangeKg && data.totalChangeKg < 0 ? 'good' : data.totalChangeKg && data.totalChangeKg > 0 ? 'warn' : undefined}
        />
      </div>

      {toGoalKg !== null ? (
        <p className="text-center text-sm text-muted-foreground">
          {Math.abs(toGoalKg) < 0.3
            ? t.progress.reachedGoal
            : `${dDelta(toGoalKg)! > 0 ? '+' : ''}${dDelta(toGoalKg)} ${unit} ${t.progress.toGoal}`}
        </p>
      ) : null}

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label={t.progress.weekAvg}
          value={data.stats.weekAvg === null ? '—' : `${d(data.stats.weekAvg)} ${unit}`}
        />
        <DeltaStat label={t.progress.weeklyChange} kg={data.stats.weeklyChangeKg} unit={unit} conv={dDelta} />
        <DeltaStat label={t.progress.monthlyChange} kg={data.stats.monthlyChangeKg} unit={unit} conv={dDelta} />
        <Stat
          label={t.progress.trend}
          value={
            data.stats.trend
              ? `${trendLabel} ${data.stats.trend.kgPerWeek > 0 ? '+' : ''}${dDelta(data.stats.trend.kgPerWeek)}${unit}${t.progress.perWeek}`
              : trendLabel
          }
        />
      </div>

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

function Stat({
  label,
  value,
  big,
  tone,
}: {
  label: string;
  value: string;
  big?: boolean;
  tone?: 'good' | 'warn';
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-0.5 py-3 text-center">
        <span
          className={cn(
            'font-bold tabular-nums',
            big ? 'text-xl' : 'text-base',
            tone === 'good' && 'text-success',
            tone === 'warn' && 'text-warning',
          )}
        >
          {value}
        </span>
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

function DeltaStat({
  label,
  kg,
  unit,
  conv,
}: {
  label: string;
  kg: number | null;
  unit: string;
  conv: (v: number | null) => number | null;
}) {
  const v = conv(kg);
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-0.5 py-3 text-center">
        <span
          className={cn(
            'flex items-center gap-1 text-base font-bold tabular-nums',
            v != null && v < 0 && 'text-success',
            v != null && v > 0 && 'text-warning',
          )}
        >
          {v == null ? (
            '—'
          ) : (
            <>
              {v < 0 ? <TrendingDown className="size-3.5" /> : v > 0 ? <TrendingUp className="size-3.5" /> : null}
              {v > 0 ? '+' : ''}
              {v} {unit}
            </>
          )}
        </span>
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
