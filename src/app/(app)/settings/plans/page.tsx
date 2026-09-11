import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, Check, X, Crown } from 'lucide-react';
import { getT } from '@/i18n/server';
import { requireUser } from '@/server/context';
import { TIER_LIMITS, showAds } from '@/server/entitlements';
import { PLAN_ORDER, PLAN_PRICE_USD, FEATURE_ROWS } from '@/features/billing/plans';
import { PlanSelectButton } from '@/features/billing/plan-select-button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Planes' };

export default async function PlansPage() {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);
  const p = t.plans;
  const currentTier = ctx.entitlement.tier;

  return (
    <div className="space-y-4">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t.settings.title}
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{p.title}</h1>
        <p className="text-sm text-muted-foreground">{p.subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((tier) => {
          const limits = TIER_LIMITS[tier];
          const price = PLAN_PRICE_USD[tier];
          const isCurrent = tier === currentTier;
          const isTop = tier === 'COACH';

          return (
            <Card
              key={tier}
              className={cn(
                'relative flex flex-col',
                isTop && 'border-primary shadow-md',
              )}
            >
              {isTop ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gap-1">
                    <Crown className="size-3" />
                    {p.topPlan}
                  </Badge>
                </div>
              ) : null}
              <CardHeader className="pb-2 text-center">
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {p.tiers[tier].name}
                </p>
                <p className="text-3xl font-bold tabular-nums">
                  {price === 0 ? p.free : `$${price.toFixed(2)}`}
                  {price > 0 ? (
                    <span className="text-sm font-normal text-muted-foreground">{p.perMonth}</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">{p.tiers[tier].tagline}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="flex-1 space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      {limits.aiCoachMessagesPerDay} {p.features.aiCoachMessages}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      {limits.aiPlansPerMonth} {p.features.aiPlans}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    {showAds({ tier }) ? (
                      <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
                    ) : (
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    )}
                    <span className={cn(showAds({ tier }) && 'text-muted-foreground/70')}>
                      {p.features.noAds}
                    </span>
                  </li>
                  {FEATURE_ROWS.map((feature) => {
                    const included = limits.features[feature];
                    return (
                      <li key={feature} className="flex items-start gap-2">
                        {included ? (
                          <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        ) : (
                          <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
                        )}
                        <span className={cn(!included && 'text-muted-foreground/70')}>
                          {p.features[feature]}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {isCurrent ? (
                  <Badge variant="secondary" className="w-full justify-center py-2 text-sm">
                    {p.currentPlan}
                  </Badge>
                ) : (
                  <PlanSelectButton
                    label={p.choose}
                    comingSoonMessage={p.comingSoon}
                    variant={isTop ? 'default' : 'outline'}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">{p.billingNote}</p>
    </div>
  );
}
