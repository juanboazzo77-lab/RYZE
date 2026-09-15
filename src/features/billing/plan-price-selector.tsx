'use client';

import { useState } from 'react';
import { interpolate } from '@/i18n/interpolate';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PlanSelectButton } from './plan-select-button';
import {
  PLAN_DURATIONS,
  PLAN_DURATION_MONTHS,
  PLAN_DURATION_DISCOUNT_PCT,
  type PlanDuration,
} from './plan-durations';

export function PlanPriceSelector({
  tier,
  prices,
  isCurrent,
  durationLabels,
  perMonthLabel,
  savingsBadge,
  billedEvery,
  currentPlanLabel,
  chooseLabel,
  comingSoonMessage,
  purchasingLabel,
  successMessage,
  errorMessage,
  variant,
}: {
  tier: 'PRO' | 'COACH';
  prices: Record<PlanDuration, number>;
  isCurrent: boolean;
  durationLabels: Record<PlanDuration, string>;
  perMonthLabel: string;
  savingsBadge: string;
  billedEvery: string;
  currentPlanLabel: string;
  chooseLabel: string;
  comingSoonMessage: string;
  purchasingLabel: string;
  successMessage: string;
  errorMessage: string;
  variant: 'default' | 'outline';
}) {
  const [duration, setDuration] = useState<PlanDuration>('monthly');
  const price = prices[duration];
  const months = PLAN_DURATION_MONTHS[duration];
  const monthlyEquivalent = price / months;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1">
        {PLAN_DURATIONS.map((d) => {
          const pct = PLAN_DURATION_DISCOUNT_PCT[d];
          const active = d === duration;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={cn(
                'relative rounded-md border px-1 py-1.5 text-center text-[11px] font-medium leading-tight transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/50',
              )}
            >
              {durationLabels[d]}
              {pct > 0 ? (
                <span
                  className={cn(
                    'absolute -top-2 -right-1 rounded-full px-1 text-[9px] font-bold',
                    active ? 'bg-background text-primary' : 'bg-primary text-primary-foreground',
                  )}
                >
                  -{pct}%
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="text-center">
        <p className="text-3xl font-bold tabular-nums">
          ${monthlyEquivalent.toFixed(2)}
          <span className="text-sm font-normal text-muted-foreground">{perMonthLabel}</span>
        </p>
        {months > 1 ? (
          <p className="text-xs text-muted-foreground">
            {interpolate(billedEvery, { price: `$${price.toFixed(2)}`, months })}
          </p>
        ) : null}
        {PLAN_DURATION_DISCOUNT_PCT[duration] > 0 ? (
          <Badge variant="success" className="mt-1">
            {interpolate(savingsBadge, { pct: PLAN_DURATION_DISCOUNT_PCT[duration] })}
          </Badge>
        ) : null}
      </div>

      {isCurrent ? (
        <Badge variant="secondary" className="w-full justify-center py-2 text-sm">
          {currentPlanLabel}
        </Badge>
      ) : (
        <PlanSelectButton
          tier={tier}
          duration={duration}
          label={chooseLabel}
          comingSoonMessage={comingSoonMessage}
          purchasingLabel={purchasingLabel}
          successMessage={successMessage}
          errorMessage={errorMessage}
          variant={variant}
        />
      )}
    </div>
  );
}
