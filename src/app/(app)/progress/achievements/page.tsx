import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { DateTime } from 'luxon';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { interpolate } from '@/i18n';
import { getAchievements } from '@/features/gamification/queries';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Logros' };

export default async function AchievementsPage() {
  const [{ t, locale }, ctx] = await Promise.all([getT(), requireUser()]);
  const items = await getAchievements(ctx.profile);
  const unlockedCount = items.filter((a) => a.unlockedAt).length;

  const byCategory = new Map<string, typeof items>();
  for (const a of items) byCategory.set(a.category, [...(byCategory.get(a.category) ?? []), a]);

  return (
    <div className="space-y-4">
      <Link
        href="/progress"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t.progress.title}
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.gamification.title}</h1>
        <p className="text-sm text-muted-foreground">
          {interpolate(t.gamification.summary, { unlocked: unlockedCount, total: items.length })}
        </p>
      </div>

      {[...byCategory.entries()].map(([category, list]) => (
        <div key={category} className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t.gamification.categories[category as 'training'] ?? category}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {list.map((a) => {
              const unlocked = Boolean(a.unlockedAt);
              const pct = a.threshold ? Math.min(100, Math.round((a.progress / a.threshold) * 100)) : 0;
              return (
                <Card
                  key={a.key}
                  className={cn(
                    'text-center',
                    unlocked ? 'border-warning/40 bg-warning/5' : 'opacity-80',
                  )}
                >
                  <CardContent className="flex flex-col items-center gap-1.5 py-4">
                    <span className={cn('text-3xl', !unlocked && 'grayscale opacity-50')}>
                      {a.icon ?? '🏆'}
                    </span>
                    <p className="text-sm font-semibold">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                    {unlocked ? (
                      <p className="mt-1 text-[11px] font-medium text-warning">
                        {interpolate(t.gamification.unlockedOn, {
                          date: DateTime.fromJSDate(a.unlockedAt!).setLocale(locale).toFormat('d LLL yyyy'),
                        })}
                      </p>
                    ) : a.threshold ? (
                      <div className="mt-1 w-full space-y-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {interpolate(t.gamification.progress, {
                            progress: a.progress,
                            threshold: a.threshold,
                          })}
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
