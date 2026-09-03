import type { Metadata } from 'next';
import { DateTime } from 'luxon';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { dayPart } from '@/lib/date';
import { getDashboardData } from '@/features/dashboard/queries';
import { NutritionCard, ProgressCard, TrainingCard, WeightCard } from '@/features/dashboard/cards';
import { QuickActions } from '@/features/dashboard/quick-actions';

export const metadata: Metadata = { title: 'Inicio' };

export default async function DashboardPage() {
  const [{ t, locale }, ctx] = await Promise.all([getT(), requireUser()]);
  const data = await getDashboardData(ctx.profile);

  const part = dayPart(ctx.profile.timezone);
  const greeting =
    part === 'morning'
      ? t.dashboard.greetingMorning
      : part === 'afternoon'
        ? t.dashboard.greetingAfternoon
        : t.dashboard.greetingEvening;

  const dateLine = DateTime.now()
    .setZone(ctx.profile.timezone)
    .setLocale(locale)
    .toFormat('cccc, d LLLL');

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm capitalize text-muted-foreground">{dateLine}</p>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}
          {ctx.profile.name ? `, ${ctx.profile.name}` : ''}
        </h1>
      </div>

      <QuickActions t={t} />

      <NutritionCard t={t} data={data.nutrition} />

      <div className="grid gap-4 sm:grid-cols-2">
        <TrainingCard t={t} data={data.training} />
        <WeightCard t={t} data={data.weight} unitSystem={ctx.profile.unitSystem} />
      </div>

      <ProgressCard t={t} data={data.progress} />
    </div>
  );
}
