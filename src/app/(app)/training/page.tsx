import type { Metadata } from 'next';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { History } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { interpolate } from '@/i18n';
import { getTrainingOverview } from '@/features/training/queries';
import { StartWorkoutButton } from '@/features/training/start-button';
import { NewPlanButton } from '@/features/training/new-plan-button';
import { PlanRow } from '@/features/training/plan-row';
import { WeekView } from '@/features/training/week-view';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'Entrenamiento' };

export default async function TrainingPage() {
  const [{ t, locale }, ctx] = await Promise.all([getT(), requireUser()]);
  const data = await getTrainingOverview(ctx.profile);

  const plan = data.activePlan;
  const todayWeekday = DateTime.now().setZone(ctx.profile.timezone).weekday;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight">{t.training.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <NewPlanButton />
          <Button variant="outline" size="sm" asChild className="rounded-full">
            <Link href="/training/history">
              <History className="size-4" />
              {t.training.history.title}
            </Link>
          </Button>
        </div>
      </div>

      {data.activeWorkout ? (
        <Card className="border-primary/50 bg-accent">
          <CardContent className="flex items-center justify-between gap-3 pt-5">
            <div>
              <p className="font-semibold">{data.activeWorkout.name}</p>
              <p className="text-xs text-muted-foreground">
                {data.activeWorkout.startedAt
                  ? interpolate(t.training.inProgressSince, {
                      time: DateTime.fromJSDate(data.activeWorkout.startedAt)
                        .setZone(ctx.profile.timezone)
                        .setLocale(locale)
                        .toFormat('HH:mm'),
                    })
                  : ''}
              </p>
            </div>
            <Button asChild>
              <Link href={`/training/session/${data.activeWorkout.id}`}>{t.training.resume}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {plan ? <WeekView plan={plan} t={t} todayWeekday={todayWeekday} showHero={!data.activeWorkout} /> : null}

      {!data.activeWorkout ? (
        <StartWorkoutButton
          label={t.training.freeWorkout}
          variant="outline"
          icon={false}
          className="h-12 w-full rounded-2xl border-dashed text-base font-semibold"
        />
      ) : null}

      <div>
        <h2 className="mb-2 mt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.training.plans}</h2>
        {data.plans.length === 0 ? (
          <Card className="rounded-2xl p-4">
            <EmptyState compact illustration="workout" title={t.training.noPlans} />
          </Card>
        ) : (
          <Card className="divide-y overflow-hidden rounded-2xl">
            {data.plans.map((p) => (
              <PlanRow key={p.id} plan={p} />
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
