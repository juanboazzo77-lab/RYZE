import type { Dictionary } from '@/i18n';
import { interpolate } from '@/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { CalorieRing } from '@/components/charts/calorie-ring';
import { MacroBar } from '@/components/charts/macro-bar';
import type { DayLog } from './queries';

export function DaySummary({ t, log }: { t: Dictionary; log: DayLog }) {
  const tn = t.nutrition;
  if (!log.target) {
    return (
      <Card>
        <CardContent className="pt-5">
          <EmptyState
            compact
            title={tn.noTarget}
            action={{ label: t.dashboard.nutrition.noTargetCta, href: '/settings/goals' }}
          />
        </CardContent>
      </Card>
    );
  }

  const { totals, target } = log;
  const remaining = target.kcal - totals.kcal;

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-5 pt-5 sm:flex-row sm:gap-6">
        <CalorieRing
          consumed={totals.kcal}
          target={target.kcal}
          centerLabel={String(totals.kcal)}
          footer={
            remaining >= 0
              ? `${remaining} ${tn.remaining}`
              : `${Math.abs(remaining)} ${tn.over}`
          }
        />
        <div className="w-full flex-1 space-y-3">
          <div className="flex items-baseline justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{tn.kcal}</span>
            <span className="tabular-nums">
              {interpolate(tn.consumedOfTarget, { consumed: totals.kcal, target: target.kcal })} kcal
            </span>
          </div>
          <MacroBar
            label={tn.protein}
            consumed={totals.proteinG}
            target={target.proteinG}
            colorVar="var(--chart-protein)"
          />
          <MacroBar
            label={tn.carbs}
            consumed={totals.carbsG}
            target={target.carbsG}
            colorVar="var(--chart-carbs)"
          />
          <MacroBar
            label={tn.fat}
            consumed={totals.fatG}
            target={target.fatG}
            colorVar="var(--chart-fat)"
          />
        </div>
      </CardContent>
    </Card>
  );
}
