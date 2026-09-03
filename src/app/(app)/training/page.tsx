import type { Metadata } from 'next';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { ChevronRight, Dumbbell } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { interpolate } from '@/i18n';
import { getTrainingOverview } from '@/features/training/queries';
import { StartWorkoutButton } from '@/features/training/start-button';
import { NewPlanButton } from '@/features/training/new-plan-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'Entrenamiento' };

export default async function TrainingPage() {
  const [{ t, locale }, ctx] = await Promise.all([getT(), requireUser()]);
  const data = await getTrainingOverview(ctx.profile);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{t.training.title}</h1>
        <NewPlanButton />
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

      {data.activePlan ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">{data.activePlan.name}</CardTitle>
            <Link
              href={`/training/plans/${data.activePlan.id}`}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t.common.edit}
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.activePlan.days.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.training.emptyDays}</p>
            ) : (
              data.activePlan.days.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.weekday ? `${t.training.weekdays[String(d.weekday) as '1']} · ` : ''}
                      {d.exerciseCount} {t.training.exercises}
                    </p>
                  </div>
                  <StartWorkoutButton
                    planDayId={d.id}
                    label={t.training.start}
                    size="sm"
                    className="shrink-0"
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {!data.activeWorkout ? (
        <StartWorkoutButton
          label={t.training.freeWorkout}
          variant="outline"
          icon={false}
          className="w-full"
        />
      ) : null}

      <div>
        <h2 className="mb-2 mt-2 text-sm font-medium text-muted-foreground">{t.training.plans}</h2>
        {data.plans.length === 0 ? (
          <Card className="p-4">
            <EmptyState
              compact
              icon={<Dumbbell className="size-5" />}
              title={t.training.noPlans}
            />
          </Card>
        ) : (
          <Card className="divide-y">
            {data.plans.map((p) => (
              <Link
                key={p.id}
                href={`/training/plans/${p.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{p.name}</span>
                  {p.isActive ? <Badge variant="success">{t.training.active}</Badge> : null}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {p.dayCount} {t.training.days}
                  <ChevronRight className="size-4" />
                </div>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
