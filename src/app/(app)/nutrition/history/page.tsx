import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { DateTime } from 'luxon';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { getRecentDays } from '@/features/nutrition/queries';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'Historial de nutrición' };

export default async function NutritionHistoryPage() {
  const [{ t, locale }, ctx] = await Promise.all([getT(), requireUser()]);
  const days = await getRecentDays(ctx.profile, 45);

  return (
    <div className="space-y-4">
      <Link
        href="/nutrition"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t.nutrition.title}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{t.nutrition.history.title}</h1>

      {days.length === 0 ? (
        <Card className="p-4">
          <EmptyState compact title={t.nutrition.history.noDays} />
        </Card>
      ) : (
        <Card className="divide-y">
          {days.map((d) => (
            <Link
              key={d.dateISO}
              href={`/nutrition?date=${d.dateISO}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/50"
            >
              <span className="text-sm font-medium capitalize">
                {DateTime.fromISO(d.dateISO, { zone: 'utc' }).setLocale(locale).toFormat('cccc d LLL')}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {d.kcal} kcal · P {d.proteinG} · C {d.carbsG} · G {d.fatG}
              </span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
