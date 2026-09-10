import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { getSports } from '@/features/sports/queries';
import { SportsManager } from '@/features/sports/sports-manager';

export const metadata: Metadata = { title: 'Deportes' };

export default async function SportsSettingsPage() {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);
  const sports = await getSports(ctx.profile);

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
        <h1 className="text-2xl font-bold tracking-tight">{t.sports.title}</h1>
        <p className="text-sm text-muted-foreground">{t.sports.subtitle}</p>
      </div>
      <SportsManager sports={sports} />
    </div>
  );
}
