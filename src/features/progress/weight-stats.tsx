import { TrendingDown, TrendingUp } from 'lucide-react';
import type { Dictionary } from '@/i18n';
import { Card, CardContent } from '@/components/ui/card';
import type { WeightSummary } from '@/lib/progress/summary';
import { displayWeight, weightUnitLabel } from '@/lib/units';
import { cn } from '@/lib/utils';

/** Los recuadros de números de la pantalla de peso. Los usan la web y la app. */

export const WEIGHT_RANGES = ['7', '30', '90', '180', '365', 'all'] as const;
export type WeightRange = (typeof WEIGHT_RANGES)[number];

type System = 'METRIC' | 'IMPERIAL';

const converters = (system: System) => ({
  unit: weightUnitLabel(system),
  d: (kg: number | null) => (kg === null ? '—' : displayWeight(kg, system).value),
  dDelta: (kg: number | null) => (kg === null ? null : Math.round((system === 'IMPERIAL' ? kg / 0.45359237 : kg) * 10) / 10),
});

/** Actual, inicial, objetivo, cambio total y cuánto falta. */
export function WeightHeadline({ t, summary, unitSystem }: { t: Dictionary; summary: WeightSummary; unitSystem: System }) {
  const { unit, d, dDelta } = converters(unitSystem);
  const toGoalKg = summary.currentKg !== null && summary.targetKg !== null ? summary.targetKg - summary.currentKg : null;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t.progress.current} value={`${d(summary.currentKg)} ${unit}`} big />
        <Stat label={t.progress.start} value={`${d(summary.startKg)} ${unit}`} />
        <Stat label={t.progress.target} value={summary.targetKg === null ? '—' : `${d(summary.targetKg)} ${unit}`} />
        <Stat
          label={t.progress.totalChange}
          value={
            summary.totalChangeKg === null
              ? '—'
              : `${summary.totalChangeKg > 0 ? '+' : ''}${dDelta(summary.totalChangeKg)} ${unit}`
          }
          tone={summary.totalChangeKg && summary.totalChangeKg < 0 ? 'good' : summary.totalChangeKg && summary.totalChangeKg > 0 ? 'warn' : undefined}
        />
      </div>

      {toGoalKg !== null ? (
        <p className="text-center text-sm text-muted-foreground">
          {Math.abs(toGoalKg) < 0.3
            ? t.progress.reachedGoal
            : `${dDelta(toGoalKg)! > 0 ? '+' : ''}${dDelta(toGoalKg)} ${unit} ${t.progress.toGoal}`}
        </p>
      ) : null}
    </>
  );
}

/** Promedio de la semana, cambios y tendencia. */
export function WeightTrend({ t, summary, unitSystem }: { t: Dictionary; summary: WeightSummary; unitSystem: System }) {
  const { unit, d, dDelta } = converters(unitSystem);
  const { stats } = summary;
  const trendLabel = stats.trend
    ? stats.trend.direction === 'down'
      ? t.progress.trendDown
      : stats.trend.direction === 'up'
        ? t.progress.trendUp
        : t.progress.trendFlat
    : '—';
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label={t.progress.weekAvg} value={stats.weekAvg === null ? '—' : `${d(stats.weekAvg)} ${unit}`} />
      <DeltaStat label={t.progress.weeklyChange} kg={stats.weeklyChangeKg} unit={unit} conv={dDelta} />
      <DeltaStat label={t.progress.monthlyChange} kg={stats.monthlyChangeKg} unit={unit} conv={dDelta} />
      <Stat
        label={t.progress.trend}
        value={
          stats.trend
            ? `${trendLabel} ${stats.trend.kgPerWeek > 0 ? '+' : ''}${dDelta(stats.trend.kgPerWeek)}${unit}${t.progress.perWeek}`
            : trendLabel
        }
      />
    </div>
  );
}

function Stat({ label, value, big, tone }: { label: string; value: string; big?: boolean; tone?: 'good' | 'warn' }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-0.5 py-3 text-center">
        <span
          className={cn(
            'font-bold tabular-nums',
            big ? 'text-xl' : 'text-base',
            tone === 'good' && 'text-success',
            tone === 'warn' && 'text-warning',
          )}
        >
          {value}
        </span>
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

function DeltaStat({ label, kg, unit, conv }: { label: string; kg: number | null; unit: string; conv: (v: number | null) => number | null }) {
  const v = conv(kg);
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-0.5 py-3 text-center">
        <span
          className={cn(
            'flex items-center gap-1 text-base font-bold tabular-nums',
            v != null && v < 0 && 'text-success',
            v != null && v > 0 && 'text-warning',
          )}
        >
          {v == null ? (
            '—'
          ) : (
            <>
              {v < 0 ? <TrendingDown className="size-3.5" /> : v > 0 ? <TrendingUp className="size-3.5" /> : null}
              {v > 0 ? '+' : ''}
              {v} {unit}
            </>
          )}
        </span>
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
