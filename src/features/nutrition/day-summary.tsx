import type { Dictionary } from '@/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { DayTotalsCard } from './day-totals-card';
import type { DayLog } from './queries';

export function DaySummary({ t, log }: { t: Dictionary; log: DayLog }) {
  if (!log.target) {
    return (
      <Card>
        <CardContent className="pt-5">
          <EmptyState
            compact
            illustration="food"
            title={t.nutrition.noTarget}
            action={{ label: t.dashboard.nutrition.noTargetCta, href: '/settings/goals' }}
          />
        </CardContent>
      </Card>
    );
  }

  return <DayTotalsCard t={t} totals={log.totals} target={log.target} />;
}
