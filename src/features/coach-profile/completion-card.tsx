import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import { getT } from '@/i18n/server';
import { interpolate } from '@/i18n';

/**
 * Nudge del dashboard: invita a completar el perfil de coaching mientras esté
 * por debajo del 80%. El % lo calcula `getDashboardData` (misma conexión), acá
 * sólo se pinta.
 */
export async function CoachProfileNudge({
  pct,
  onboarded,
}: {
  pct: number;
  onboarded: boolean;
}) {
  if (!onboarded || pct >= 80) return null;

  const { t } = await getT();
  const c = t.coachProfile;

  return (
    <Link
      href="/settings/about"
      className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3 transition-colors hover:bg-primary/10"
    >
      <Sparkles className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{c.nudgeTitle}</p>
        <p className="text-xs text-muted-foreground">{interpolate(c.nudgeBody, { n: pct })}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
