import { TrendingUp, Trophy } from 'lucide-react';
import type { PrType } from '@prisma/client';
import type { Dictionary } from '@/i18n';
import type { Improvements } from '@/lib/training/progress';

export function ImprovementBadges({ t, imp }: { t: Dictionary; imp: Improvements }) {
  const items: string[] = [];
  if (imp.moreWeight) items.push(t.training.improve.weight);
  if (imp.moreReps) items.push(t.training.improve.reps);
  if (imp.moreVolume) items.push(t.training.improve.volume);
  if (items.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {items.map((x) => (
        <span
          key={x}
          className="inline-flex items-center gap-0.5 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success"
        >
          <TrendingUp className="size-3" />
          {x}
        </span>
      ))}
    </span>
  );
}

export function PrBadges({ t, types }: { t: Dictionary; types: PrType[] }) {
  if (types.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {types.map((x) => (
        <span
          key={x}
          className="inline-flex items-center gap-0.5 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning"
        >
          <Trophy className="size-3" />
          {t.training.pr[x]}
        </span>
      ))}
    </span>
  );
}
