import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DateTime } from 'luxon';
import { ChevronLeft, Clock, Dumbbell, Trophy } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { getCompletedWorkout } from '@/features/training/history-queries';
import { ImprovementBadges, PrBadges } from '@/features/training/progress-badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Entrenamiento' };

function fmtDuration(sec: number | null): string {
  if (!sec) return '—';
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

export default async function CompletedWorkoutPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const [{ t, locale }, ctx, { workoutId }] = await Promise.all([
    getT(),
    requireUser(),
    params,
  ]);
  const w = await getCompletedWorkout(ctx.profile, workoutId);
  if (!w) notFound();

  const allPrTypes = [...new Set(w.exercises.flatMap((e) => e.prTypes))];

  return (
    <div className="space-y-4">
      <Link
        href="/training/history"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t.training.history.title}
      </Link>

      <div>
        <p className="text-sm text-muted-foreground">
          {w.finishedAt
            ? DateTime.fromJSDate(w.finishedAt).setLocale(locale).toFormat('cccc d LLL · HH:mm')
            : ''}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{w.name}</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <Clock className="size-4 text-muted-foreground" />
            <span className="text-lg font-bold tabular-nums">{fmtDuration(w.durationSeconds)}</span>
            <span className="text-xs text-muted-foreground">{t.training.history.duration}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <Dumbbell className="size-4 text-muted-foreground" />
            <span className="text-lg font-bold tabular-nums">
              {Math.round(w.totalVolume).toLocaleString(locale)}
            </span>
            <span className="text-xs text-muted-foreground">{t.training.workoutDone.totalVolume} (kg)</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <Trophy className="size-4 text-warning" />
            <span className="text-lg font-bold tabular-nums">{allPrTypes.length}</span>
            <span className="text-xs text-muted-foreground">{t.training.history.prsShort}</span>
          </CardContent>
        </Card>
      </div>

      {allPrTypes.length > 0 ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4 text-warning" />
              {t.training.workoutDone.prsAchieved}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {w.exercises
              .filter((e) => e.prTypes.length > 0)
              .map((e) => (
                <div key={e.workoutExerciseId} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/training/exercises/${e.exerciseId}`}
                    className="font-medium hover:underline"
                  >
                    {e.name}
                  </Link>
                  <PrBadges t={t} types={e.prTypes} />
                </div>
              ))}
          </CardContent>
        </Card>
      ) : null}

      {w.exercises.map((e) => {
        const working = e.sets.filter((s) => !s.isWarmup);
        return (
          <Card key={e.workoutExerciseId}>
            <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
              <div>
                <Link
                  href={`/training/exercises/${e.exerciseId}`}
                  className="font-semibold hover:underline"
                >
                  {e.name}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <PrBadges t={t} types={e.prTypes} />
                  <ImprovementBadges t={t} imp={e.improvements} />
                </div>
              </div>
              {e.type === 'CARDIO' ? null : (
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {Math.round(e.metrics.volume).toLocaleString(locale)} kg · vol
                </span>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y text-sm">
                {working.map((s) => (
                  <div key={s.setNumber} className="flex items-center justify-between py-1.5 tabular-nums">
                    <span className="text-muted-foreground">
                      {t.training.workoutDone.set} {s.setNumber}
                    </span>
                    <span className="font-medium">
                      {e.type === 'CARDIO'
                        ? [
                            s.durationSeconds ? `${Math.round(s.durationSeconds / 60)} min` : null,
                            s.distanceMeters ? `${(s.distanceMeters / 1000).toFixed(1)} km` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || '–'
                        : `${s.weightKg ?? '–'} kg × ${s.reps ?? '–'}`}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Button asChild variant="outline" className="w-full">
        <Link href="/training">{t.training.workoutDone.backToTraining}</Link>
      </Button>
    </div>
  );
}
