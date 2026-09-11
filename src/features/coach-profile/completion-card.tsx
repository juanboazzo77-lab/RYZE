import Link from 'next/link';
import { Sparkles, ChevronRight, Crown } from 'lucide-react';
import { getT } from '@/i18n/server';
import { interpolate } from '@/i18n';

/**
 * Nudge del dashboard sobre el perfil de coaching (exclusivo del plan COACH).
 * - Con acceso y perfil incompleto: invita a completarlo.
 * - Sin acceso: teaser que promociona el plan COACH y lleva al paywall.
 * El % lo calcula `getDashboardData` (misma conexión); acá sólo se pinta.
 */
export async function CoachProfileNudge({
  pct,
  onboarded,
  hasAccess,
}: {
  pct: number;
  onboarded: boolean;
  hasAccess: boolean;
}) {
  if (!onboarded) return null;
  if (hasAccess && pct >= 80) return null;

  const { t } = await getT();
  const c = t.coachProfile;

  return (
    <Link
      href={hasAccess ? '/settings/about' : '/settings/plans'}
      className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3 transition-colors hover:bg-primary/10"
    >
      {hasAccess ? (
        <Sparkles className="size-5 shrink-0 text-primary" />
      ) : (
        <Crown className="size-5 shrink-0 text-primary" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{hasAccess ? c.nudgeTitle : c.upsellNudgeTitle}</p>
        <p className="text-xs text-muted-foreground">
          {hasAccess ? interpolate(c.nudgeBody, { n: pct }) : c.upsellNudgeBody}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
