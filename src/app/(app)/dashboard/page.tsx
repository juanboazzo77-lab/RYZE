import type { Metadata } from 'next';
import { DateTime } from 'luxon';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { dayPart } from '@/lib/date';
import { can } from '@/server/entitlements';
import { aiConfigured } from '@/server/ai/config';
import { getDashboardData } from '@/features/dashboard/queries';
import { isCheckinDue } from '@/features/checkin/queries';
import { NutritionCard, ProgressCard, TrainingCard, WeightCard } from '@/features/dashboard/cards';
import { CheckinReminder } from '@/features/dashboard/checkin-reminder';
import { FirstPlanCard } from '@/features/dashboard/first-plan-card';
import { QuickActions } from '@/features/dashboard/quick-actions';
import { CompetitionBanner } from '@/features/sports/competition-banner';
import { CoachProfileNudge } from '@/features/coach-profile/completion-card';

export const metadata: Metadata = { title: 'Inicio' };

export default async function DashboardPage() {
  const [{ t, locale }, ctx] = await Promise.all([getT(), requireUser()]);
  // Secuencial a propósito: DATABASE_URL usa connection_limit=1, dos $transaction
  // en paralelo se pisan en el pool (P2024).
  const data = await getDashboardData(ctx.profile);
  const checkinDue = can(ctx.entitlement, 'weekly_checkin')
    ? await isCheckinDue(ctx.profile)
    : false;

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

      {checkinDue ? <CheckinReminder t={t} /> : null}

      <CompetitionBanner profile={ctx.profile} />

      <CoachProfileNudge
        pct={data.coachProfilePct}
        onboarded={Boolean(ctx.profile.onboardingCompletedAt)}
      />

      {!data.hasPlan ? <FirstPlanCard t={t} aiReady={aiConfigured()} /> : null}

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
