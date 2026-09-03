import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, Trophy } from 'lucide-react';
import { DateTime } from 'luxon';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { getWorkoutHistory } from '@/features/training/history-queries';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'Historial de entrenamientos' };

function fmtDuration(sec: number | null): string {
  if (!sec) return '';
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

export default async function TrainingHistoryPage() {
  const [{ t, locale }, ctx] = await Promise.all([getT(), requireUser()]);
  const items = await getWorkoutHistory(ctx.profile, 60);

  return (
    <div className="space-y-4">
      <Link
        href="/training"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t.training.title}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{t.training.history.title}</h1>

      {items.length === 0 ? (
        <Card className="p-4">
          <EmptyState compact title={t.training.history.empty} />
        </Card>
      ) : (
        <Card className="divide-y">
          {items.map((w) => (
            <Link
              key={w.id}
              href={`/training/workouts/${w.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{w.name}</span>
                  {w.prCount > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-xs text-warning">
                      <Trophy className="size-3" />
                      {w.prCount}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {w.finishedAt
                    ? DateTime.fromJSDate(w.finishedAt).setLocale(locale).toFormat('ccc d LLL')
                    : ''}
                  {w.durationSeconds ? ` · ${fmtDuration(w.durationSeconds)}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {Math.round(w.volume).toLocaleString(locale)} kg
              </span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
