'use client';

import { ArrowUp, Dumbbell, Minus, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/i18n/provider';
import type { TrainingProposal } from './schema';

const ACTION_ICON = {
  increase_load: ArrowUp,
  add_reps: Plus,
  add_set: Plus,
  hold: Minus,
  reduce: Minus,
} as const;

export function CheckinTraining({ proposal }: { proposal: TrainingProposal }) {
  const t = useT();
  const tt = t.checkin.training;

  const hadRealChange =
    proposal.call === 'deload' ||
    proposal.adjustments.some(
      (a) => a.action === 'add_reps' || a.action === 'add_set' || a.action === 'reduce',
    );

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

        <p className="text-xs text-success">{hadRealChange ? tt.doneNote : tt.appliedNone}</p>
      </CardContent>
    </Card>
  );
}
