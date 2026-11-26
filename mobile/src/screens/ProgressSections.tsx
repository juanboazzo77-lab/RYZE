import { DateTime } from 'luxon';
import { ChevronLeft } from 'lucide-react';
import { AchievementsGrid } from '@/features/gamification/achievements-grid';
import { ConsistencyBody } from '@/features/consistency/screen-body';
import { consistencyView } from '@/features/consistency/view';
import { StatsBody } from '@/features/stats/stats-body';
import type { Dictionary } from '@/i18n';
import { addDaysISO, localTodayISO } from '@/lib/date';
import { computeStats } from '@/lib/stats/compute';
import type { AppData } from '@/lib/sync/data';
import { hasStats } from '@/lib/sync/progress';
import { useText } from '../strings';
import { useNow } from '../use-now';
import { Card } from '../ui';

/** Estadísticas, constancia y logros, con lo guardado en el teléfono. */

export type ProgressSection = 'stats' | 'consistency' | 'achievements';

function Back({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <ChevronLeft className="size-4" />
      {label}
    </button>
  );
}

/** Las comidas de los últimos 30 días sumadas por día, como las mira la web. */
function foodByDay(data: AppData, todayISO: string) {
  const from = addDaysISO(todayISO, -30);
  const days = new Map<string, { kcal: number; proteinG: number }>();
  for (const e of data.nutrition?.entries ?? []) {
    if (e.date < from) continue;
    const d = days.get(e.date) ?? { kcal: 0, proteinG: 0 };
    days.set(e.date, { kcal: d.kcal + e.kcal, proteinG: d.proteinG + e.proteinG });
  }
  return [...days.values()];
}

export function Section({
  section,
  t,
  locale,
  data,
  onBack,
}: {
  section: ProgressSection;
  t: Dictionary;
  locale: string;
  data: AppData;
  onBack: () => void;
}) {
  const now = useNow();
  const s = useText();
  const missing = <Card className="text-sm text-muted-foreground">{s.needOnce}</Card>;
  const todayISO = localTodayISO(data.profile.timezone, DateTime.fromJSDate(now));
  const back = <Back label={t.progress.title} onBack={onBack} />;

  if (section === 'consistency') {
    if (!data.trainedDays) return <>{back}{missing}</>;
    return (
      <ConsistencyBody
        t={t}
        locale={locale}
        view={consistencyView(new Set(data.trainedDays), todayISO, data.profile.weekStart)}
        firstName={(data.profile.name ?? '').trim().split(/\s+/)[0] ?? ''}
        back={back}
        empty={<p className="text-sm text-muted-foreground">{t.consistency.empty}</p>}
        canDownload={false}
      />
    );
  }

  if (section === 'achievements') {
    return (
      <div className="space-y-4">
        {back}
        {data.achievements ? (
          <AchievementsGrid
            t={t}
            locale={locale}
            items={data.achievements.map((a) => ({ ...a, unlockedAt: a.unlockedAt ? new Date(a.unlockedAt) : null }))}
          />
        ) : (
          missing
        )}
      </div>
    );
  }

  const header = (
    <>
      {back}
      <h1 className="text-2xl font-bold tracking-tight">{t.stats.title}</h1>
    </>
  );
  if (!data.stats || !data.access) return <div className="space-y-4">{header}{missing}</div>;
  if (!hasStats(data.access, now)) {
    // La misma regla que la web. Sin botón de compra: los pagos llegan a la app en la etapa 4.
    return (
      <div className="space-y-4">
        {header}
        <Card className="space-y-2 border-primary/30 bg-accent py-8 text-center">
          <p className="font-semibold">{t.pro.title}</p>
          <p className="text-sm text-muted-foreground">{t.pro.statsDesc}</p>
        </Card>
      </div>
    );
  }
  const numbers = computeStats({
    workouts: data.stats.workouts,
    foodByDay: foodByDay(data, todayISO),
    target: data.nutrition?.target ?? null,
    timezone: data.profile.timezone,
    weekStart: data.profile.weekStart,
    now,
  });
  return (
    <StatsBody
      t={t}
      locale={locale}
      data={{ ...numbers, recentPrs: data.stats.records.map((r) => ({ ...r, exerciseId: '', achievedAt: new Date(r.achievedAt) })) }}
      header={header}
      emptyPrs={<p className="py-3 text-center text-sm text-muted-foreground">{t.stats.noPrs}</p>}
      prRow={(pr, className, content) => (
        <div key={pr.id} className={className}>
          {content}
        </div>
      )}
    />
  );
}
