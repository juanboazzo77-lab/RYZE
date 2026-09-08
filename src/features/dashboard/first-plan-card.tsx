import Link from 'next/link';
import { Dumbbell, Sparkles } from 'lucide-react';
import type { Dictionary } from '@/i18n';

/** Nudge de activación: aparece en el dashboard cuando el usuario no tiene
 *  ninguna rutina. Prioriza generar el plan con IA. */
export function FirstPlanCard({ t, aiReady }: { t: Dictionary; aiReady: boolean }) {
  const c = t.dashboard.firstPlan;
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-semibold">{c.title}</p>
            <p className="text-sm text-muted-foreground">{c.body}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {aiReady ? (
              <Link
                href="/coach/new-plan"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Sparkles className="size-4" />
                {c.ctaAi}
              </Link>
            ) : null}
            <Link
              href="/training"
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Dumbbell className="size-4" />
              {aiReady ? c.ctaManual : c.ctaManualPrimary}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
