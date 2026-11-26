import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { getAchievements } from '@/features/gamification/queries';
import { AchievementsGrid } from '@/features/gamification/achievements-grid';

export const metadata: Metadata = { title: 'Logros' };

export default async function AchievementsPage() {
  const [{ t, locale }, ctx] = await Promise.all([getT(), requireUser()]);
  const items = await getAchievements(ctx.profile);

  return (
    <div className="space-y-4">
      <Link
        href="/progress"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t.progress.title}
      </Link>
      <AchievementsGrid t={t} locale={locale} items={items} />
    </div>
  );
}
