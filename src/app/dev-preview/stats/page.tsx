import { notFound } from 'next/navigation';
import { getT } from '@/i18n/server';
import { StatsView } from '@/features/stats/stats-view';

/** Vista de Estadísticas con datos de ejemplo, SÓLO en desarrollo. En producción no existe (404). */
export default async function DevStatsPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  const { t, locale } = await getT();
  const counts = [2, 3, 3, 4, 2, 4, 5, 3];
  const volumes = [5904, 5904, 5904, 5904, 7800, 12400, 11200, 12900];
  const weeks = counts.map((workouts, i) => ({
    weekStartISO: `2026-09-${String(7 + i * 7).padStart(2, '0')}`,
    label: `${String(9 + Math.floor((7 + i * 7 - 1) / 31)).padStart(2, '0')}/${String(((7 + i * 7 - 1) % 31) + 1).padStart(2, '0')}`,
    workouts,
    volume: volumes[i]!,
  }));
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6">
      <StatsView
        t={t}
        locale={locale}
        header={<h1 className="text-2xl font-bold tracking-tight">{t.stats.title}</h1>}
        data={{
          weeks,
          avgKcal: 2056,
          avgProtein: 150,
          adherencePct: 50,
          loggedDays: 17,
          recentPrs: [
            { id: '1', exerciseId: 'a', exerciseName: 'Hack Squat', type: 'MAX_WEIGHT', value: 90, unit: 'kg', achievedAt: new Date('2026-10-28') },
            { id: '2', exerciseId: 'b', exerciseName: 'Prensa de piernas', type: 'MAX_WEIGHT', value: 220, unit: 'kg', achievedAt: new Date('2026-10-21') },
          ],
        }}
      />
    </div>
  );
}
