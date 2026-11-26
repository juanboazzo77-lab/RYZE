import { useEffect, useState } from 'react';
import { ChevronLeft, Clock, Dumbbell, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImprovementBadges, PrBadges } from '@/features/training/progress-badges';
import type { Dictionary } from '@/i18n';
import type { AppData, PastWorkout } from '@/lib/sync/data';
import { compareToPrev, sessionMetrics } from '@/lib/training/progress';
import { useText } from '../strings';

/** El historial y el detalle de cada entrenamiento, con el mismo diseño que la web, sin conexión. */

function duration(sec: number | null, empty = ''): string {
  if (!sec) return empty;
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

const done = (sets: PastWorkout['exercises'][number]['sets']) => sets.filter((s) => s.isCompleted && !s.isWarmup);
const volumeOf = (w: PastWorkout) => sessionMetrics(w.exercises.flatMap((e) => done(e.sets))).volume;

function Pending() {
  const s = useText();
  return <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">{s.pendingBadge}</span>;
}

export function History({ t, data, pendingIds, onBack }: { t: Dictionary; data: AppData; pendingIds: Set<string>; onBack: () => void }) {
  const locale = data.profile.locale.toLowerCase();
  const items = data.training?.past;
  const [openId, setOpenId] = useState<string | null>(null);
  const s = useText();
  const open = items?.find((w) => w.id === openId) ?? null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [openId]);

  if (open && items) {
    return <Detail t={t} workout={open} items={items} locale={locale} timezone={data.profile.timezone} pending={pendingIds.has(open.id)} onBack={() => setOpenId(null)} />;
  }

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: data.profile.timezone });

  return (
    <>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="size-4" />
        {t.training.title}
      </button>
      <h1 className="text-2xl font-bold tracking-tight">{t.training.history.title}</h1>
      {!items ? (
        <Card className="p-4 text-sm text-muted-foreground">{s.needOnce}</Card>
      ) : items.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">{t.training.history.empty}</Card>
      ) : (
        <Card className="divide-y">
          {items.map((w) => (
            <button key={w.id} type="button" onClick={() => setOpenId(w.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{w.name}</span>
                  {w.records.length > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-xs text-warning">
                      <Trophy className="size-3" />
                      {w.records.length}
                    </span>
                  ) : null}
                  {pendingIds.has(w.id) ? <Pending /> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {date(w.finishedAt)}
                  {w.durationSeconds ? ` · ${duration(w.durationSeconds)}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{Math.round(volumeOf(w)).toLocaleString(locale)} kg</span>
            </button>
          ))}
        </Card>
      )}
    </>
  );
}

function Detail({
  t, workout, items, locale, timezone, pending, onBack,
}: {
  t: Dictionary;
  workout: PastWorkout;
  items: PastWorkout[];
  locale: string;
  timezone: string;
  pending: boolean;
  onBack: () => void;
}) {
  const s = useText();
  const prTypes = [...new Set(workout.records.map((r) => r.type))];
  const prsOf = (exerciseId: string) => workout.records.filter((r) => r.exerciseId === exerciseId).map((r) => r.type);
  /** La vez anterior de ese ejercicio, entre lo que está guardado en el teléfono. */
  const previous = (exerciseId: string) => {
    for (const w of items) {
      if (w.finishedAt >= workout.finishedAt) continue;
      const sets = w.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => done(e.sets));
      if (sets.length > 0) return sessionMetrics(sets);
    }
    return null;
  };
  const stats = [
    { icon: <Clock className="size-4 text-muted-foreground" />, value: duration(workout.durationSeconds, '—'), label: t.training.history.duration },
    { icon: <Dumbbell className="size-4 text-muted-foreground" />, value: Math.round(volumeOf(workout)).toLocaleString(locale), label: `${t.training.workoutDone.totalVolume} (kg)` },
    { icon: <Trophy className="size-4 text-warning" />, value: String(prTypes.length), label: t.training.history.prsShort },
  ];

  return (
    <>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="size-4" />
        {t.training.history.title}
      </button>
      <div>
        <p className="text-sm text-muted-foreground">
          {new Date(workout.finishedAt).toLocaleString(locale, { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone })}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{workout.name}</h1>
        {pending ? <p className="mt-1 text-xs text-warning">{s.historyPending}</p> : null}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex flex-col items-center gap-1 px-1 py-4 text-center">
              {item.icon}
              <span className="text-lg font-bold tabular-nums">{item.value}</span>
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {prTypes.length > 0 ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4 text-warning" />
              {t.training.workoutDone.prsAchieved}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {workout.exercises
              .filter((e) => prsOf(e.exerciseId).length > 0)
              .map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2">
                  <span className="font-medium">{e.name}</span>
                  <PrBadges t={t} types={prsOf(e.exerciseId)} />
                </div>
              ))}
          </CardContent>
        </Card>
      ) : null}

      {workout.exercises.map((e) => {
        const metrics = sessionMetrics(done(e.sets));
        const working = e.sets.filter((s) => !s.isWarmup);
        return (
          <Card key={e.id}>
            <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
              <div>
                <h2 className="font-semibold">{e.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <PrBadges t={t} types={prsOf(e.exerciseId)} />
                  <ImprovementBadges t={t} imp={compareToPrev(metrics, previous(e.exerciseId))} />
                </div>
              </div>
              {e.type === 'CARDIO' ? null : (
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{Math.round(metrics.volume).toLocaleString(locale)} kg · vol</span>
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
                        ? [s.durationSeconds ? `${Math.round(s.durationSeconds / 60)} min` : null, s.distanceMeters ? `${(s.distanceMeters / 1000).toFixed(1)} km` : null]
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

      <Button variant="outline" className="w-full" onClick={onBack}>
        {t.training.history.title}
      </Button>
    </>
  );
}
