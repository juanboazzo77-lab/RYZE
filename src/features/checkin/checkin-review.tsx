'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Check, Sparkles, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { interpolate } from '@/i18n/interpolate';
import type { CheckinProposal } from './schema';
import { applyCheckinAdjustment, dismissCheckinAdjustment } from './actions';

interface Props {
  weekStart: string;
  summary: string | null;
  proposal: CheckinProposal | null;
  status: string;
}

export function CheckinReview({ weekStart, summary, proposal, status }: Props) {
  const t = useT();
  const tr = t.checkin.review;
  const [pending, start] = useTransition();
  const [localStatus, setLocalStatus] = useState(status);

  if (!summary) return null;

  const hasAdjustment =
    proposal?.kind === 'nutrition_targets' && proposal.to !== null && proposal.from !== null;

  function apply() {
    start(async () => {
      const res = await applyCheckinAdjustment({ weekStart });
      if (res.ok) {
        setLocalStatus('APPLIED');
        toast.success(tr.applied);
      } else {
        toast.error(t.checkin.genericError);
      }
    });
  }

  function dismiss() {
    start(async () => {
      const res = await dismissCheckinAdjustment({ weekStart });
      if (res.ok) {
        setLocalStatus('SUBMITTED');
        toast.message(tr.dismissed);
      } else {
        toast.error(t.checkin.genericError);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          {tr.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="whitespace-pre-wrap text-sm">{summary}</p>

        {localStatus === 'APPLIED' && proposal?.to ? (
          <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
            <p className="font-medium text-success">{tr.appliedTitle}</p>
            <p className="mt-1 tabular-nums text-muted-foreground">
              {proposal.from ? macros(proposal.from) : ''} → {macros(proposal.to)}
            </p>
          </div>
        ) : hasAdjustment && localStatus === 'REVIEWED' ? (
          <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="text-sm font-medium">{tr.proposalTitle}</p>
            <p className="text-sm tabular-nums">
              <span className="text-muted-foreground">{macros(proposal!.from!)}</span>
              {'  →  '}
              <span className="font-semibold">{macros(proposal!.to!)}</span>
            </p>
            <p className="text-xs text-muted-foreground">{proposal!.rationale}</p>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={apply} disabled={pending}>
                <Check className="size-4" />
                {tr.apply}
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss} disabled={pending}>
                <X className="size-4" />
                {tr.dismiss}
              </Button>
            </div>
          </div>
        ) : proposal?.rationale ? (
          <p className="rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
            {interpolate(tr.noChange, { reason: proposal.rationale })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );

  function macros(m: { kcal: number; proteinG: number; carbsG: number; fatG: number }) {
    return `${m.kcal} kcal · P ${m.proteinG} · C ${m.carbsG} · G ${m.fatG}`;
  }
}
