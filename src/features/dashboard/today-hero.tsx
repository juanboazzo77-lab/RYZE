import Link from 'next/link';
import { Check, Dumbbell, Flame, Scale, UtensilsCrossed } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Dictionary } from '@/i18n';
import { interpolate } from '@/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { CalorieRing } from '@/components/charts/calorie-ring';
import { MacroBar } from '@/components/charts/macro-bar';
import { cn } from '@/lib/utils';
import { SkipTodayButton } from '@/features/training/shift-days';
import type { DashboardData } from './queries';

/**
 * «Lo de hoy»: lo único que hace falta ver al abrir la app. Un anillo de calorías con sus
 * macros y, debajo, las dos cosas que se hacen una vez al día (entrenar y pesarse), con su
 * botón. El detalle (peso, racha, adherencia) queda más abajo, en tarjetas más chicas.
 */
export function TodayHero({ t, data }: { t: Dictionary; data: DashboardData }) {
  const td = t.dashboard.today;
  const tn = t.dashboard.nutrition;
  const tt = t.dashboard.training;
  const { target, consumed } = data.nutrition;

  const hasWorkout = data.training.kind !== 'none';
  const workoutDone = data.training.kind === 'workout' && data.training.status === 'COMPLETED';
  const mealDone = consumed.kcal > 0;
  const weightDone = data.weight.loggedToday;

  const total = 2 + (hasWorkout ? 1 : 0);
  const done = (mealDone ? 1 : 0) + (weightDone ? 1 : 0) + (workoutDone ? 1 : 0);

  const trainingLabel =
    data.training.kind === 'planned'
      ? tt.start
      : data.training.kind === 'workout'
        ? data.training.status === 'ACTIVE'
          ? tt.continueW
          : data.training.status === 'COMPLETED'
            ? tt.review
            : tt.start
        : tt.noneCta;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="size-4 text-chart-kcal" />
          {td.title}
        </CardTitle>
        <Badge variant={done === total ? 'success' : 'secondary'}>
          {interpolate(td.progress, { a: done, b: total })}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {!target ? (
          <EmptyState
            compact
            title={tn.noTarget}
            action={{ label: tn.noTargetCta, href: '/settings/goals' }}
          />
        ) : (
          <div className="flex items-center gap-4">
            <CalorieRing
              size={132}
              consumed={consumed.kcal}
              target={target.kcal}
              centerLabel={String(consumed.kcal)}
              footer={
                consumed.kcal <= target.kcal
                  ? `${target.kcal - consumed.kcal} ${tn.remaining}`
                  : `${consumed.kcal - target.kcal} ${tn.over}`
              }
            />
            <div className="min-w-0 flex-1 space-y-3">
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

        <div className="divide-y rounded-lg border">
          <Row
            done={mealDone}
            icon={<UtensilsCrossed className="size-4" />}
            title={tn.title}
            subtitle={target ? `${consumed.kcal} / ${target.kcal} ${tn.kcal.toLowerCase()}` : undefined}
            href="/nutrition"
            cta={td.logMeal}
          />
          {hasWorkout && data.training.kind !== 'none' ? (
            <Row
              done={workoutDone}
              icon={<Dumbbell className="size-4" />}
              title={data.training.name}
              subtitle={`${data.training.exerciseCount} ${tt.exercises} · ${data.training.estMinutes} ${tt.minutesEst}`}
              href="/training"
              cta={trainingLabel}
              extra={data.training.kind === 'planned' ? <SkipTodayButton /> : undefined}
            />
          ) : (
            <Row
              done={false}
              muted
              icon={<Dumbbell className="size-4" />}
              title={tt.none}
              href="/training"
              cta={tt.noneCta}
            />
          )}
          <Row
            done={weightDone}
            icon={<Scale className="size-4" />}
            title={weightDone ? td.weightDone : td.weightPending}
            href="/progress"
            cta={td.logCta}
            hideCta={weightDone}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  done,
  muted,
  icon,
  title,
  subtitle,
  href,
  cta,
  hideCta,
  extra,
}: {
  done: boolean;
  muted?: boolean;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  href: string;
  cta: string;
  hideCta?: boolean;
  /** Algo chico debajo del texto (p. ej. un atajo). */
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-full',
          done ? 'bg-success/15 text-success' : 'bg-secondary text-muted-foreground',
        )}
      >
        {done ? <Check className="size-4" /> : icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium', muted && 'text-muted-foreground')}>{title}</p>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        {extra}
      </div>
      {hideCta ? null : (
        <Link
          href={href}
          className={cn(
            'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium',
            done || muted
              ? 'border text-foreground hover:bg-accent'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          {cta}
        </Link>
      )}
    </div>
  );
}
