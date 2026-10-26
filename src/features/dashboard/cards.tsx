import Link from 'next/link';
import { ChevronRight, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import type { UnitSystem } from '@prisma/client';
import type { Dictionary } from '@/i18n';
import { interpolate } from '@/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { displayWeight, displayWeightDelta, weightUnitLabel } from '@/lib/units';
import { cn } from '@/lib/utils';
import type { DashboardData } from './queries';

export function WeightCard({
  t,
  data,
  unitSystem,
}: {
  t: Dictionary;
  data: DashboardData['weight'];
  unitSystem: UnitSystem;
}) {
  const tw = t.dashboard.weight;
  const unit = weightUnitLabel(unitSystem);

  if (data.currentKg === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="size-4" />
            {tw.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState compact title={tw.noData} action={{ label: tw.logCta, href: '/progress' }} />
        </CardContent>
      </Card>
    );
  }

  const current = displayWeight(data.currentKg, unitSystem);
  const change =
    data.weeklyChangeKg !== null ? displayWeightDelta(data.weeklyChangeKg, unitSystem) : null;
  const toGoal =
    data.targetKg !== null
      ? displayWeightDelta(data.targetKg - data.currentKg, unitSystem)
      : null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="size-4" />
          {tw.title}
        </CardTitle>
        <Link href="/progress" className="text-muted-foreground hover:text-foreground">
          <ChevronRight className="size-4" />
        </Link>
      </CardHeader>
      <CardContent className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-bold tabular-nums">
            {current.value}
            <span className="ml-1 text-base font-normal text-muted-foreground">{unit}</span>
          </div>
          {change ? (
            <div
              className={cn(
                'mt-1 flex items-center gap-1 text-sm',
                change.value < 0 ? 'text-success' : change.value > 0 ? 'text-warning' : 'text-muted-foreground',
              )}
            >
              {change.value < 0 ? (
                <TrendingDown className="size-4" />
              ) : change.value > 0 ? (
                <TrendingUp className="size-4" />
              ) : null}
              <span className="tabular-nums">
                {change.value > 0 ? '+' : ''}
                {change.value} {unit}
              </span>
              <span className="text-muted-foreground">{tw.vsLastWeek}</span>
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">{tw.needMoreData}</p>
          )}
        </div>
        {toGoal && toGoal.value !== 0 ? (
          <div className="text-right text-xs text-muted-foreground">
            <div className="tabular-nums text-sm font-medium text-foreground">
              {toGoal.value > 0 ? '+' : ''}
              {toGoal.value} {unit}
            </div>
            {tw.toGoal}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ProgressCard({ t, data }: { t: Dictionary; data: DashboardData['progress'] }) {
  const tp = t.dashboard.progress;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{tp.title}</CardTitle>
        <Link href="/progress" className="text-muted-foreground hover:text-foreground">
          <ChevronRight className="size-4" />
        </Link>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-2xl font-bold tabular-nums">🔥 {data.streak}</div>
          <div className="text-xs text-muted-foreground">
            {tp.streak} ({tp.days})
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums">
            {data.weekWorkouts}
            <span className="text-sm font-normal text-muted-foreground">/{data.weekWorkoutTarget}</span>
          </div>
          <div className="text-xs text-muted-foreground">{tp.weekWorkouts}</div>
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums">
            {data.adherencePct === null ? '—' : `${data.adherencePct}%`}
          </div>
          <div className="text-xs text-muted-foreground">
            {data.adherencePct === null
              ? tp.adherence
              : interpolate(tp.adherenceDays, { a: data.adherentDays, b: data.loggedDays })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
