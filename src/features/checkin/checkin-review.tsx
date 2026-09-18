'use client';

import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useT } from '@/i18n/provider';
import { interpolate } from '@/i18n/interpolate';
import type { CheckinProposal } from './schema';

interface Props {
  summary: string | null;
  proposal: CheckinProposal | null;
  isCoachTier?: boolean;
}

export function CheckinReview({ summary, proposal, isCoachTier }: Props) {
  const t = useT();
  const tr = t.checkin.review;

  if (!summary) return null;

  const hasAdjustment =
    proposal?.kind === 'nutrition_targets' && proposal.to !== null && proposal.from !== null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          {isCoachTier ? tr.reportTitle : tr.title}
          {isCoachTier ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {tr.reportBadge}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="whitespace-pre-wrap text-sm">{summary}</p>

        {hasAdjustment ? (
          <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
            <p className="font-medium text-success">{tr.appliedTitle}</p>
            <p className="mt-1 tabular-nums text-muted-foreground">
              {macros(proposal!.from!)} → {macros(proposal!.to!)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{proposal!.rationale}</p>
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
