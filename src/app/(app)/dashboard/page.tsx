import type { Metadata } from 'next';
import { DateTime } from 'luxon';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { dayPart } from '@/lib/date';
import { can, limitsFor } from '@/server/entitlements';
import { aiConfigured } from '@/server/ai/config';
import { getDashboardData } from '@/features/dashboard/queries';
import { isCheckinDue } from '@/features/checkin/queries';
import { ProgressCard, WeightCard } from '@/features/dashboard/cards';
import { TodayHero } from '@/features/dashboard/today-hero';
import { CheckinReminder } from '@/features/dashboard/checkin-reminder';
import { FirstPlanCard } from '@/features/dashboard/first-plan-card';
import { CompetitionBanner } from '@/features/sports/competition-banner';
import { CoachProfileNudge } from '@/features/coach-profile/completion-card';
import { GymBrandCard } from '@/features/gym/gym-brand-card';
import { countMemberRoutines } from '@/server/gym-routines';
import { nextChallengeBanner } from '@/server/gym-challenges';
import { listActiveMessages } from '@/server/gym-messages';
import { GymMessages } from '@/features/gym/gym-message-chip';
import { GymTrialCard } from '@/features/gym/gym-trial-card';
import { trialDaysLeft, trialState } from '@/features/gym/trial';
import { nextBookingFor } from '@/server/gym-classes';
import { NextClassChip } from '@/features/gym/next-class-chip';
import { ChallengeBanner } from '@/features/gym/challenge-banner';

export const metadata: Metadata = { title: 'Inicio' };

export default async function DashboardPage() {
  const [{ t, locale }, ctx] = await Promise.all([getT(), requireUser()]);
  // Secuencial a propósito: DATABASE_URL usa connection_limit=1, dos $transaction
  // en paralelo se pisan en el pool (P2024).
  const data = await getDashboardData(ctx.profile);
  const checkinDue = can(ctx.entitlement, 'weekly_checkin')
    ? await isCheckinDue(ctx.profile, limitsFor(ctx.entitlement).checkinEveryWeeks)
    : false;

  const challenge = ctx.gym ? await nextChallengeBanner(ctx.userId, ctx.gym.gymId) : null;
  // Los avisos vigentes del gimnasio (si no hay ninguno, no se muestra nada).
  const gymMessages = ctx.gym ? await listActiveMessages(ctx.gym.gymId) : [];
  const nextClass = ctx.gym ? await nextBookingFor(ctx.userId, ctx.gym.gymId) : null;

  // Quien entró con el código: días que le quedan de prueba, o que active su plan si ya terminó (no se muestra si ya paga uno).
  const gymTrial = ctx.gym ? trialState(ctx.gym) : 'NONE';
  const showTrial = ctx.gym && ((gymTrial === 'ACTIVE' && ctx.entitlement.gymAccess) || (gymTrial === 'ENDED' && ctx.entitlement.tier === 'FREE'));

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

      {ctx.gym ? <GymBrandCard gym={ctx.gym} routineCount={await countMemberRoutines(ctx.gym.gymId)} /> : null}

      {showTrial && ctx.gym ? <GymTrialCard gymName={ctx.gym.name} gymCode={ctx.gym.inviteCode} state={gymTrial === 'ACTIVE' ? 'ACTIVE' : 'ENDED'} daysLeft={trialDaysLeft(ctx.gym.trialEndsAt)} /> : null}
      {ctx.gym && gymMessages.length > 0 ? <GymMessages gymName={ctx.gym.name} messages={gymMessages} /> : null}
      {nextClass ? <NextClassChip booking={nextClass} /> : null}

      {challenge ? <ChallengeBanner challenge={challenge} /> : null}

      {checkinDue ? <CheckinReminder t={t} /> : null}

      <CompetitionBanner profile={ctx.profile} />

      <CoachProfileNudge
        pct={data.coachProfilePct}
        onboarded={Boolean(ctx.profile.onboardingCompletedAt)}
        hasAccess={can(ctx.entitlement, 'coach_profile')}
      />

      {!data.hasPlan ? <FirstPlanCard t={t} aiReady={aiConfigured()} /> : null}

      <TodayHero t={t} data={data} />

      <div className="grid gap-4 sm:grid-cols-2">
        <WeightCard t={t} data={data.weight} unitSystem={ctx.profile.unitSystem} />
        <ProgressCard t={t} data={data.progress} />
      </div>
    </div>
  );
}
