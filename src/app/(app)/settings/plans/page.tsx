import type { Metadata } from 'next';
import { getT } from '@/i18n/server';
import { requireUser } from '@/server/context';
import { isInTrial, trialDaysLeft } from '@/server/entitlements';
import { PlansView } from '@/features/billing/plans-view';
import { getTrialRecap } from '@/features/billing/recap';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { MANAGED } from '@/features/trainer/copy';

export const metadata: Metadata = { title: 'Planes' };

export default async function PlansPage() {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);
  // Conectado con un entrenador: no paga ningún plan.
  if (ctx.managedByTrainer) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{MANAGED.plansTitle}</h1>
        <Card className="space-y-3 p-4 text-sm text-muted-foreground">
          <p>{MANAGED.plansText}</p>
          <Link href="/settings" className="text-foreground underline">
            {MANAGED.plansBack}
          </Link>
        </Card>
      </div>
    );
  }
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
