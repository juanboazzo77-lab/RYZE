'use client';

import { useMemo } from 'react';
import { DateTime } from 'luxon';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useI18n } from '@/i18n/provider';

export interface WeightChartPoint {
  date: string;
  weight: number | null;
  avg: number;
}

export function WeightChart({
  data,
  targetKg,
  unitLabel = 'kg',
  height = 240,
}: {
  data: WeightChartPoint[];
  targetKg: number | null;
  unitLabel?: string;
  height?: number;
}) {
  const { locale, t } = useI18n();

  const rows = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        label: DateTime.fromISO(d.date, { zone: 'utc' }).setLocale(locale).toFormat('d LLL'),
      })),
    [data, locale],
  );

  if (rows.length < 2) {
    return (
      <div
        className="grid place-items-center rounded-lg border border-dashed text-sm text-muted-foreground"
        style={{ height }}
      >
        {t.progress.needMoreData}
      </div>
    );
  }

  const vals = rows.flatMap((r) => [r.weight ?? r.avg, r.avg, ...(targetKg ? [targetKg] : [])]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max(0.5, (max - min) * 0.12);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            minTickGap={24}
          />
          <YAxis
            domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--popover-foreground)',
            }}
            labelStyle={{ color: 'var(--muted-foreground)' }}
            formatter={(v: number, name) => [
              `${v} ${unitLabel}`,
              name === 'avg' ? t.progress.movingAvg : t.progress.weight,
            ]}
          />
          {targetKg ? (
            <ReferenceLine
              y={targetKg}
              stroke="var(--chart-carbs)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            dot={{ r: 2 }}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke="var(--primary)"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
