import Link from 'next/link';
import { ChevronRight, Dumbbell, Flame, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import type { UnitSystem } from '@prisma/client';
import type { Dictionary } from '@/i18n';
import { interpolate } from '@/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { displayWeight, weightUnitLabel } from '@/lib/units';
import { cn } from '@/lib/utils';
import { CalorieRing } from '@/components/charts/calorie-ring';
import { MacroBar } from '@/components/charts/macro-bar';
import type { DashboardData } from './queries';

export function NutritionCard({ t, data }: { t: Dictionary; data: DashboardData['nutrition'] }) {
  const tn = t.dashboard.nutrition;
  const { target, consumed } = data;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="size-4 text-chart-kcal" />
          {tn.title}
        </CardTitle>
        <Link href="/nutrition" className="text-muted-foreground hover:text-foreground">
          <ChevronRight className="size-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {!target ? (
          <EmptyState
            compact
            title={tn.noTarget}
            action={{ label: tn.noTargetCta, href: '/settings/goals' }}
          />
        ) : (
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
            <CalorieRing
              consumed={consumed.kcal}
              target={target.kcal}
              centerLabel={String(consumed.kcal)}
              footer={
                consumed.kcal <= target.kcal
                  ? `${target.kcal - consumed.kcal} ${tn.remaining}`
                  : `${consumed.kcal - target.kcal} ${tn.over}`
              }
            />
            <div className="w-full flex-1 space-y-3">
              <MacroBar
                label={tn.protein}
                consumed={consumed.proteinG}
                target={target.proteinG}
                colorVar="var(--chart-protein)"
              />
              <MacroBar
                label={tn.carbs}
                consumed={consumed.carbsG}
                target={target.carbsG}
                colorVar="var(--chart-carbs)"
              />
              <MacroBar
                label={tn.fat}
                consumed={consumed.fatG}
                target={target.fatG}
                colorVar="var(--chart-fat)"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TrainingCard({ t, data }: { t: Dictionary; data: DashboardData['training'] }) {
  const tt = t.dashboard.training;

  const statusLabel: Record<string, string> = {
    PENDING: tt.statusPending,
    ACTIVE: tt.statusActive,
    COMPLETED: tt.statusCompleted,
    SKIPPED: tt.statusSkipped,
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Dumbbell className="size-4 text-primary" />
          {tt.title}
        </CardTitle>
        <Link href="/training" className="text-muted-foreground hover:text-foreground">
          <ChevronRight className="size-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {data.kind === 'none' ? (
          <EmptyState compact title={tt.none} action={{ label: tt.noneCta, href: '/training' }} />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{data.name}</span>
                <Badge variant={data.kind === 'workout' && data.status === 'COMPLETED' ? 'success' : 'secondary'}>
                  {data.kind === 'planned' ? tt.planned : statusLabel[data.status]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.exerciseCount} {tt.exercises} · {data.estMinutes} {tt.minutesEst}
              </p>
            </div>
            <Link
              href="/training"
              className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {data.kind === 'planned'
                ? tt.start
                : data.status === 'ACTIVE'
                  ? tt.continueW
                  : data.status === 'COMPLETED'
                    ? tt.review
                    : tt.start}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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

function displayWeightDelta(deltaKg: number, unitSystem: UnitSystem): { value: number } {
  const v = unitSystem === 'IMPERIAL' ? deltaKg / 0.45359237 : deltaKg;
  return { value: Math.round(v * 10) / 10 };
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
