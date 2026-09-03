'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Segmented } from '@/components/form/segmented';
import { ProgressLineChart } from '@/components/charts/progress-line-chart';
import { useI18n } from '@/i18n/provider';
import { ImprovementBadges } from './progress-badges';
import type { ExerciseProgress } from './history-queries';

type Metric = 'weight' | 'oneRm' | 'volume';

export function ExerciseProgressView({ data }: { data: ExerciseProgress }) {
  const { t, locale } = useI18n();
  const [metric, setMetric] = useState<Metric>('oneRm');

  const prCards: Array<{ label: string; value: number; unit: string }> = [];
  if (data.prs.MAX_WEIGHT) prCards.push({ label: t.training.pr.MAX_WEIGHT, value: data.prs.MAX_WEIGHT, unit: 'kg' });
  if (data.prs.EST_1RM) prCards.push({ label: t.training.pr.EST_1RM, value: data.prs.EST_1RM, unit: 'kg' });
  if (data.prs.MAX_REPS) prCards.push({ label: t.training.pr.MAX_REPS, value: data.prs.MAX_REPS, unit: 'reps' });
  if (data.prs.MAX_VOLUME) prCards.push({ label: t.training.pr.MAX_VOLUME, value: Math.round(data.prs.MAX_VOLUME), unit: 'kg' });

  const chartData = useMemo(
    () =>
      data.sessions.map((s) => ({
        label: DateTime.fromISO(s.date, { zone: 'utc' }).setLocale(locale).toFormat('d LLL'),
        value:
          metric === 'weight'
            ? s.metrics.topWeightKg
            : metric === 'oneRm'
              ? Math.round(s.metrics.est1RM * 10) / 10
              : Math.round(s.metrics.volume),
      })),
    [data.sessions, metric, locale],
  );

  const chartUnit = metric === 'volume' || metric === 'weight' ? 'kg' : 'kg';

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">{t.training.muscles[data.exercise.primaryMuscle]}</p>
        <h1 className="text-2xl font-bold tracking-tight">{data.exercise.name}</h1>
      </div>

      {prCards.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {prCards.map((p) => (
            <Card key={p.label}>
              <CardContent className="flex flex-col items-center gap-0.5 py-3 text-center">
                <span className="text-lg font-bold tabular-nums">{p.value}</span>
                <span className="text-[11px] text-muted-foreground">
                  {p.label} ({p.unit})
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {data.sessions.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          {t.training.progress.noSessions}
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.training.progress.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Segmented
                options={[
                  { value: 'weight', label: t.training.progress.metricWeight },
                  { value: 'oneRm', label: t.training.progress.metric1RM },
                  { value: 'volume', label: t.training.progress.metricVolume },
                ]}
                value={metric}
                onChange={(v) => setMetric(v)}
              />
              <ProgressLineChart data={chartData} unit={chartUnit} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.training.progress.sessions}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y pt-0">
              {[...data.sessions].reverse().map((s) => (
                <Link
                  key={s.workoutId}
                  href={`/training/workouts/${s.workoutId}`}
                  className="flex items-center justify-between gap-3 py-2.5 hover:bg-secondary/40"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {DateTime.fromISO(s.date, { zone: 'utc' }).setLocale(locale).toFormat('ccc d LLL')}
                    </p>
                    <div className="mt-0.5">
                      <ImprovementBadges t={t} imp={s.improvements} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    <div className="text-sm font-medium text-foreground">
                      {s.metrics.topWeightKg || '–'} kg × {s.metrics.topReps || '–'}
                    </div>
                    {t.training.progress.volume}: {Math.round(s.metrics.volume).toLocaleString(locale)} · 1RM{' '}
                    {Math.round(s.metrics.est1RM)}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
