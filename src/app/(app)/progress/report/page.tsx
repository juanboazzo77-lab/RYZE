import type { Metadata } from 'next';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getT } from '@/i18n/server';
import { requireUser } from '@/server/context';
import { displayWeightDelta } from '@/lib/units';
import { getMonthlyReport, resolveMonth } from '@/features/progress/report';
import { ReportShare, type ReportStat } from '@/features/progress/report-share';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'Resumen mensual' };

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const [{ t, locale }, ctx, sp] = await Promise.all([getT(), requireUser(), searchParams]);
  const month = resolveMonth(sp.m, ctx.profile.timezone);
  const r = await getMonthlyReport(ctx.profile, month);
  const r18 = t.report;

  const first = DateTime.fromISO(`${month}-01`, { zone: ctx.profile.timezone }).setLocale(locale);
  const label = first.toFormat('LLLL yyyy');
  const title = label.charAt(0).toUpperCase() + label.slice(1);
  const prev = first.minus({ months: 1 }).toFormat('yyyy-MM');
  const next = first.plus({ months: 1 }).toFormat('yyyy-MM');
  const isCurrent = month === DateTime.now().setZone(ctx.profile.timezone).toFormat('yyyy-MM');

  const imperial = ctx.profile.unitSystem === 'IMPERIAL';
  const stats: ReportStat[] = [];
  if (r.workouts > 0) {
    stats.push({ value: String(r.workouts), label: r18.workouts });
    stats.push({
      value: r.minutes >= 60 ? `${(r.minutes / 60).toFixed(1)} h` : `${r.minutes} min`,
      label: r18.timeTrained,
    });
    const vol = imperial ? r.volumeKg * 2.20462 : r.volumeKg;
    stats.push({
      value: vol >= 1000 ? `${(vol / 1000).toFixed(1)} ${imperial ? 'k lb' : 't'}` : `${Math.round(vol)} ${imperial ? 'lb' : 'kg'}`,
      label: r18.volume,
    });
  }
  if (r.records > 0) stats.push({ value: String(r.records), label: r18.records });
  if (r.weight && r.weight.changeKg !== 0) {
    const d = displayWeightDelta(r.weight.changeKg, ctx.profile.unitSystem);
    stats.push({ value: `${d.value > 0 ? '+' : ''}${d.value} ${imperial ? 'lb' : 'kg'}`, label: r18.weight });
  }
  if (r.nutrition.adherencePct !== null && r.nutrition.loggedDays > 0) {
    stats.push({ value: `${r.nutrition.adherencePct}%`, label: r18.adherence });
  } else if (r.nutrition.loggedDays > 0) {
    stats.push({ value: String(r.nutrition.loggedDays), label: r18.mealDays });
  }

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
        <h1 className="text-2xl font-bold tracking-tight">{r18.title}</h1>
        <p className="text-sm text-muted-foreground">{r18.subtitle}</p>
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-card px-2 py-1.5">
        <Link
          href={`/progress/report?m=${prev}`}
          aria-label={r18.prev}
          className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-secondary"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <span className="font-semibold">{title}</span>
        {isCurrent ? (
          <span className="size-9" />
        ) : (
          <Link
            href={`/progress/report?m=${next}`}
            aria-label={r18.next}
            className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-secondary"
          >
            <ChevronRight className="size-5" />
          </Link>
        )}
      </div>

      {!r.hasData || stats.length === 0 ? (
        <EmptyState illustration="chart" title={r18.empty} />
      ) : (
        <ReportShare
          title={title}
          name={ctx.profile.name ?? ''}
          stats={stats}
          shareText={r18.shareText}
        />
      )}
    </div>
  );
}
