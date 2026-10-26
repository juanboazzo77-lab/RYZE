import type { Metadata } from 'next';
import { getT } from '@/i18n/server';
import { requireUser } from '@/server/context';
import { isInTrial, trialDaysLeft } from '@/server/entitlements';
import { PlansView } from '@/features/billing/plans-view';
import { getTrialRecap } from '@/features/billing/recap';

export const metadata: Metadata = { title: 'Planes' };

export default async function PlansPage() {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);
  // Sólo a quien todavía no paga: es el recordatorio de lo que ya construyó en la app.
  const recap = ctx.entitlement.tier === 'FREE' ? await getTrialRecap(ctx.profile) : null;
  return (
    <PlansView
      t={t}
      currentTier={ctx.entitlement.tier}
      trial={{ inTrial: isInTrial(ctx.entitlement), daysLeft: trialDaysLeft(ctx.entitlement) }}
      hasSubscription={!!ctx.entitlement.lemonSqueezySubscriptionId}
      recap={recap}
      unitSystem={ctx.profile.unitSystem}
    />
  );
}
