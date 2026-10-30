import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { can } from '@/server/entitlements';
import { getStatsPage } from '@/features/stats/queries';
import { StatsView } from '@/features/stats/stats-view';
import { UpsellCard } from '@/components/upsell-card';

export const metadata: Metadata = { title: 'Estadísticas' };

const WEEKS = 8;

export default async function StatsPage() {
  const [{ t, locale }, ctx] = await Promise.all([getT(), requireUser()]);

  const header = (
    <>
      <Link
        href="/progress"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t.progress.title}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{t.stats.title}</h1>
    </>
  );

  if (!can(ctx.entitlement, 'advanced_stats')) {
    return (
      <div className="space-y-4">
        {header}
        <UpsellCard
          t={t}
          description={t.pro.statsDesc}
          ctaHref="/settings/plans"
          ctaLabel={t.pro.viewPlans}
        />
      </div>
    );
  }

  const data = await getStatsPage(ctx.profile, WEEKS);

  return <StatsView t={t} locale={locale} data={data} header={header} />;
}
