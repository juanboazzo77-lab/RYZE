import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getT } from '@/i18n/server';
import { requireUser } from '@/server/context';
import { getFriendsOverview, REFERRAL_BONUS_DAYS } from '@/server/friends';
import { FriendsClient } from '@/features/friends/friends-client';

export const metadata: Metadata = { title: 'Amigos' };

export default async function FriendsPage() {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);
  const overview = await getFriendsOverview(ctx.profile);
  return (
    <div className="space-y-4">
      <Link
        href="/progress"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t.nav.progress}
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.friends.title}</h1>
        <p className="text-sm text-muted-foreground">{t.friends.subtitle}</p>
      </div>
      <FriendsClient
        code={overview.code}
        invited={overview.invited}
        ranking={overview.ranking}
        bonusDays={REFERRAL_BONUS_DAYS}
      />
    </div>
  );
}
