'use client';

import { Dumbbell, Lightbulb, Moon, Utensils } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { PhysiqueAnalysis } from '@/features/coach-profile/physique-schema';

const AREA_ICON = {
  entrenamiento: Dumbbell,
  nutricion: Utensils,
  habitos: Moon,
} as const;

const LEVEL_STYLE = {
  rezagado: 'border-warning/50 bg-warning/10 text-warning',
  equilibrado: 'text-muted-foreground',
  destacado: 'border-success/50 bg-success/10 text-success',
} as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

/** Informe completo de un análisis de físico. */
export function PhysiqueReport({ report }: { report: PhysiqueAnalysis }) {
  const t = useT();
  const tp = t.physique;

  return (
    <div className="space-y-4">
      {report.bodyFatEstimate ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-secondary/60 p-3">
          <div>
            <p className="text-xs text-muted-foreground">{tp.bodyFat}</p>
            <p className="text-2xl font-bold tabular-nums">{report.bodyFatEstimate}</p>
          </div>
          <Badge variant="outline">{tp.confidence[report.bodyFatConfidence]}</Badge>
        </div>
      ) : null}

      {report.summary ? (
        <Section title={tp.summary}>
          <p className="text-sm">{report.summary}</p>
        </Section>
      ) : null}

      {report.muscleBalance.length > 0 ? (
        <Section title={tp.balance}>
          <ul className="divide-y rounded-lg border">
            {report.muscleBalance.map((m) => (
              <li key={m.group} className="flex items-start justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize">{m.group}</p>
                  {m.note ? <p className="text-xs text-muted-foreground">{m.note}</p> : null}
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                    LEVEL_STYLE[m.level],
                  )}
                >
                  {tp.levels[m.level]}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {report.posture ? (
        <Section title={tp.posture}>
          <p className="text-sm">{report.posture}</p>
        </Section>
      ) : null}

      {report.strengths.length > 0 ? (
        <Section title={tp.strengths}>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {report.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {report.weakPoints ? (
        <Section title={tp.weakPoints}>
          <p className="text-sm">{report.weakPoints}</p>
        </Section>
      ) : null}

      {report.recommendations.length > 0 ? (
        <Section title={tp.recommendations}>
          <ul className="space-y-2">
            {report.recommendations.map((r, i) => {
              const Icon = AREA_ICON[r.area];
              return (
                <li key={i} className="flex gap-2.5 rounded-lg border p-2.5">
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {tp.areas[r.area]}
                    </p>
                    <p className="text-sm">{r.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      {report.photoTips ? (
        <div className="flex gap-2.5 rounded-lg bg-secondary/50 p-3 text-sm">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {tp.photoTips}
            </p>
            <p>{report.photoTips}</p>
          </div>
        </div>
      ) : null}

      <p className="text-[11px] text-muted-foreground">{tp.disclaimer}</p>
    </div>
  );
}
