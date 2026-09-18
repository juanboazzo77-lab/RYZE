'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import type { OverviewPlan } from './queries';
import { deletePlan } from './actions';

export function PlanRow({ plan }: { plan: OverviewPlan }) {
  const t = useT();
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/training/plans/${plan.id}`}
        className="flex flex-1 items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/50"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{plan.name}</span>
          {plan.isActive ? <Badge variant="success">{t.training.active}</Badge> : null}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {plan.dayCount} {t.training.days}
          <ChevronRight className="size-4" />
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 mr-2"
        aria-label={t.training.deletePlan}
        disabled={pending}
        onClick={() => {
          if (confirm(`${t.training.deletePlan}: ${plan.name}?`)) {
            start(() => void deletePlan({ id: plan.id }));
          }
        }}
      >
        <Trash2 className="size-3.5 text-destructive" />
      </Button>
    </div>
  );
}
