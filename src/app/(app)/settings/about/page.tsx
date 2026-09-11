import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getT } from '@/i18n/server';
import { requireUser } from '@/server/context';
import { can } from '@/server/entitlements';
import { getCoachProfile } from '@/features/coach-profile/queries';
import { CoachProfileForm } from '@/features/coach-profile/coach-profile-form';
import { UpsellCard } from '@/components/upsell-card';

export const metadata: Metadata = { title: 'Perfil para el coach' };

export default async function CoachProfileSettingsPage() {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);

  const header = (
    <>
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t.settings.title}
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.coachProfile.title}</h1>
        <p className="text-sm text-muted-foreground">{t.coachProfile.subtitle}</p>
      </div>
    </>
  );

  // Exclusivo del plan COACH: no gastamos ni una query si no tiene acceso.
  if (!can(ctx.entitlement, 'coach_profile')) {
    return (
      <div className="space-y-4">
        {header}
        <UpsellCard
          t={t}
          title={t.pro.coachTierTitle}
          badge={t.pro.coachTierBadge}
          description={t.pro.coachProfileDesc}
        />
      </div>
    );
  }

  const initial = await getCoachProfile(ctx.profile);

  return (
    <div className="space-y-4">
      {header}
      <CoachProfileForm initial={initial} sex={ctx.profile.sex} />
    </div>
  );
}
