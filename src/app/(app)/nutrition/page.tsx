import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarClock, CopyPlus, Sparkles } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { localTodayISO } from '@/lib/date';
import { MEAL_ORDER, getDayLog, getFrequentMeals } from '@/features/nutrition/queries';
import { DayNav } from '@/features/nutrition/day-nav';
import { DaySummary } from '@/features/nutrition/day-summary';
import { MealSection } from '@/features/nutrition/meal-section';
import { CopyDayDialog } from '@/features/nutrition/frequent-and-copy';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Nutrición' };

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const [{ t }, ctx, sp] = await Promise.all([getT(), requireUser(), searchParams]);
  const todayISO = localTodayISO(ctx.profile.timezone);
  const wanted = sp.date ?? '';
  const dateISO = /^\d{4}-\d{2}-\d{2}$/.test(wanted) && wanted <= todayISO ? wanted : todayISO;

  const [log, frequent] = await Promise.all([
    getDayLog(ctx.profile, dateISO),
    getFrequentMeals(ctx.profile),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{t.nutrition.title}</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
            <Link href="/nutrition/plan">
              <Sparkles className="size-4" />
              <span className="hidden sm:inline">{t.nutrition.planWithAi}</span>
            </Link>
          </Button>
          <CopyDayDialog toDate={dateISO} todayISO={todayISO}>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <CopyPlus className="size-4" />
              <span className="hidden sm:inline">{t.nutrition.copyFromDay}</span>
            </Button>
          </CopyDayDialog>
          <Button variant="ghost" size="icon" asChild aria-label={t.nutrition.history.title}>
            <Link href="/nutrition/history">
              <CalendarClock className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <DayNav dateISO={dateISO} todayISO={todayISO} />
      <DaySummary t={t} log={log} />

      {MEAL_ORDER.map((m) => (
        <MealSection
          key={m}
          date={dateISO}
          mealType={m}
          entries={log.meals[m]}
          total={log.mealTotals[m]}
          frequentMeals={frequent}
        />
      ))}
    </div>
  );
}
