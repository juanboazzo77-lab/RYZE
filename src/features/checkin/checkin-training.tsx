'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ArrowUp, Check, Dumbbell, Minus, Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/i18n/provider';
import type { TrainingProposal } from './schema';
import { applyCheckinTraining, dismissCheckinTraining } from './actions';

const ACTION_ICON = {
  increase_load: ArrowUp,
  add_reps: Plus,
  add_set: Plus,
  hold: Minus,
  reduce: Minus,
} as const;

export function CheckinTraining({
  weekStart,
  proposal,
}: {
  weekStart: string;
  proposal: TrainingProposal;
}) {
  const t = useT();
  const tt = t.checkin.training;
  const [pending, start] = useTransition();
  const [done, setDone] = useState(proposal.applied);

  const canApply = proposal.adjustments.some(
    (a) => a.action === 'add_reps' || a.action === 'add_set',
  );

  function apply() {
    start(async () => {
      const res = await applyCheckinTraining({ weekStart });
      if (res.ok) {
        setDone(true);
        toast.success(res.changed ? tt.appliedN.replace('{n}', String(res.changed)) : tt.appliedNone);
      } else toast.error(t.checkin.genericError);
    });
  }

  function dismiss() {
    start(async () => {
      const res = await dismissCheckinTraining({ weekStart });
      if (res.ok) setDone(true);
      else toast.error(t.checkin.genericError);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Dumbbell className="size-4 text-primary" />
          {tt.title}
          <Badge variant={proposal.call === 'deload' ? 'warning' : 'secondary'}>
            {tt.calls[proposal.call]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="whitespace-pre-wrap text-sm">{proposal.summary}</p>

        {proposal.adjustments.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {proposal.adjustments.map((a, i) => {
              const Icon = ACTION_ICON[a.action];
              return (
                <li key={i} className="flex items-start gap-2 p-2.5 text-sm">
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="font-medium">{a.exercise}</span>
                    <span className="text-muted-foreground"> — {a.detail}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}

        {done ? (
          <p className="text-xs text-success">{tt.doneNote}</p>
        ) : (
          <div className="flex gap-2 pt-1">
            {canApply ? (
              <Button size="sm" onClick={apply} disabled={pending}>
                <Check className="size-4" />
                {tt.apply}
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={dismiss} disabled={pending}>
              <X className="size-4" />
              {canApply ? tt.dismiss : tt.gotIt}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
