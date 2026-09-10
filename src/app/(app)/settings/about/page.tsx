import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getT } from '@/i18n/server';
import { requireUser } from '@/server/context';
import { getCoachProfile } from '@/features/coach-profile/queries';
import { CoachProfileForm } from '@/features/coach-profile/coach-profile-form';

export const metadata: Metadata = { title: 'Perfil para el coach' };

export default async function CoachProfileSettingsPage() {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);
  const initial = await getCoachProfile(ctx.profile);

  return (
    <div className="space-y-4">
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

      <CoachProfileForm initial={initial} sex={ctx.profile.sex} />
    </div>
  );
}
