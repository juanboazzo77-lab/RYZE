import Link from 'next/link';
import { Dumbbell, Flame, Trophy } from 'lucide-react';
import { DateTime } from 'luxon';
import { interpolate } from '@/i18n/interpolate';
import type { Dictionary } from '@/i18n';
import type { StatsPageData } from './queries';
import { ProgressLineChart } from '@/components/charts/progress-line-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

/** Aro de progreso chico (el verde de la marca sobre una pista suave). */
function Ring({ pct, children }: { pct: number; children: React.ReactNode }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(pct, 100)) / 100;
  return (
    <div className="relative grid size-24 shrink-0 place-items-center">
      <svg viewBox="0 0 80 80" className="absolute inset-0 size-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="9" className="stroke-secondary" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={`${c * p} ${c}`}
        />
      </svg>
      <div className="relative text-center leading-none">{children}</div>
    </div>
  );
}

export function StatsView({
  t,
  locale,
  data,
  header,
}: {
  t: Dictionary;
  locale: string;
  data: StatsPageData;
  header: React.ReactNode;
}) {
  const nf = new Intl.NumberFormat(locale);
  const weeksCount = data.weeks.length;
  const maxWorkouts = Math.max(1, ...data.weeks.map((w) => w.workouts));
  const totalWorkouts = data.weeks.reduce((a, w) => a + w.workouts, 0);
  const totalVolume = data.weeks.reduce((a, w) => a + w.volume, 0);
  const perWeek = totalWorkouts / Math.max(1, weeksCount);
  const bestWeek = Math.max(0, ...data.weeks.map((w) => w.workouts));
  const lastIdx = weeksCount - 1;

  return (
    <div className="space-y-4">
      {header}

      {/* Resumen */}
      <div className="rounded-3xl bg-gradient-to-br from-primary/25 via-primary/10 to-transparent p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          {interpolate(t.stats.lastWeeks, { n: weeksCount })}
        </p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-6xl font-extrabold leading-none tabular-nums">{totalWorkouts}</span>
          <span className="pb-1 text-base font-semibold text-muted-foreground">{t.stats.totalWorkouts}</span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-background/60 px-3 py-2.5">
            <p className="text-lg font-extrabold tabular-nums">{nf.format(totalVolume)}</p>
            <p className="text-[11px] leading-tight text-muted-foreground">{t.stats.totalVolume} (kg)</p>
          </div>
          <div className="rounded-2xl bg-background/60 px-3 py-2.5">
            <p className="text-lg font-extrabold tabular-nums">{nf.format(Math.round(perWeek * 10) / 10)}</p>
            <p className="text-[11px] leading-tight text-muted-foreground">{t.stats.perWeek}</p>
          </div>
          <div className="rounded-2xl bg-background/60 px-3 py-2.5">
            <p className="text-lg font-extrabold tabular-nums">{bestWeek}</p>
            <p className="text-[11px] leading-tight text-muted-foreground">{t.stats.bestWeek}</p>
          </div>
        </div>
      </div>

      {/* Entrenamientos por semana */}
      <Card className="overflow-hidden rounded-3xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="size-4 text-primary" />
            {t.stats.weeklyWorkouts}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-44 items-stretch gap-1.5">
            {data.weeks.map((w, i) => {
              const current = i === lastIdx;
              const pct = (w.workouts / maxWorkouts) * 100;
              return (
                <div key={w.weekStartISO} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative w-full flex-1">
                    {w.workouts > 0 ? (
                      <span
                        className="absolute inset-x-0 text-center text-xs font-bold tabular-nums"
                        style={{ bottom: `calc(${Math.max(8, pct)}% + 4px)` }}
                      >
                        {w.workouts}
                      </span>
                    ) : null}
                    <div
                      title={`${w.workouts}`}
                      className={
                        w.workouts === 0
                          ? 'absolute inset-x-0 bottom-0 h-1 rounded-full bg-secondary'
                          : current
                            ? 'absolute inset-x-0 bottom-0 rounded-t-xl rounded-b-md bg-primary'
                            : 'absolute inset-x-0 bottom-0 rounded-t-xl rounded-b-md bg-primary/35'
                      }
                      style={w.workouts === 0 ? undefined : { height: `${Math.max(8, pct)}%` }}
                    />
                  </div>
                  <span
                    className={
                      current
                        ? 'text-[10px] font-bold text-primary'
                        : 'text-[10px] text-muted-foreground'
                    }
                  >
                    {w.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Volumen semanal */}
      <Card className="overflow-hidden rounded-3xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="size-4 text-primary" />
            {t.stats.weeklyVolume}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressLineChart
            data={data.weeks.map((w) => ({ label: w.label, value: w.volume }))}
            unit="kg"
            color="var(--chart-protein)"
            height={200}
            area
          />
        </CardContent>
      </Card>

      {/* Alimentación */}
      <Card className="rounded-3xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.stats.nutritionAvg}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Ring pct={data.adherencePct ?? 0}>
            <p className="text-xl font-extrabold tabular-nums">
              {data.adherencePct === null ? t.stats.noData : `${data.adherencePct}%`}
            </p>
            <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              {t.stats.adherence}
            </p>
          </Ring>
          <div className="grid min-w-0 flex-1 gap-2">
            <div className="rounded-2xl bg-secondary/60 px-3 py-2">
              <p className="text-lg font-extrabold tabular-nums">
                {data.avgKcal === null ? t.stats.noData : nf.format(data.avgKcal)}
                <span className="ml-1 text-xs font-semibold text-muted-foreground">kcal</span>
              </p>
              <p className="text-[11px] text-muted-foreground">{t.stats.avgKcal}</p>
            </div>
            <div className="rounded-2xl bg-secondary/60 px-3 py-2">
              <p className="text-lg font-extrabold tabular-nums">
                {data.avgProtein === null ? t.stats.noData : nf.format(data.avgProtein)}
                <span className="ml-1 text-xs font-semibold text-muted-foreground">g</span>
              </p>
              <p className="text-[11px] text-muted-foreground">{t.stats.avgProtein}</p>
            </div>
          </div>
        </CardContent>
        <CardContent className="pt-0 text-center text-xs text-muted-foreground">
          {interpolate(t.stats.loggedDays, { n: data.loggedDays })}
        </CardContent>
      </Card>

      {/* Récords */}
      <Card className="rounded-3xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.stats.recentPrs}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {data.recentPrs.length === 0 ? (
            <EmptyState compact illustration="trophy" title={t.stats.noPrs} />
          ) : (
            <div className="space-y-1.5">
              {data.recentPrs.map((pr) => (
                <Link
                  key={pr.id}
                  href={`/training/exercises/${pr.exerciseId}`}
                  className="flex items-center gap-3 rounded-2xl bg-secondary/50 p-2.5 transition-colors hover:bg-secondary"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
                    <Trophy className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{pr.exerciseName}</span>
                    <span className="block text-xs text-muted-foreground">
                      {t.training.pr[pr.type as 'MAX_WEIGHT']} ·{' '}
                      {DateTime.fromJSDate(pr.achievedAt).setLocale(locale).toFormat('d LLL')}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-extrabold tabular-nums">
                    {pr.value} <span className="text-xs font-semibold text-muted-foreground">{pr.unit}</span>
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
