import type { Metadata } from 'next';
import { DateTime } from 'luxon';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { interpolate } from '@/i18n';
import { can } from '@/server/entitlements';
import { getCheckinPage } from '@/features/checkin/queries';
import { CheckinForm } from '@/features/checkin/checkin-form';
import { CheckinReview } from '@/features/checkin/checkin-review';
import type { CheckinProposal } from '@/features/checkin/schema';
import { UpsellCard } from '@/components/upsell-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Revisión semanal' };

export default async function CheckinPage() {
  const [{ t, locale }, ctx] = await Promise.all([getT(), requireUser()]);

  if (!can(ctx.entitlement, 'weekly_checkin')) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{t.checkin.title}</h1>
        <UpsellCard t={t} description={t.pro.checkinDesc} />
      </div>
    );
  }

  const data = await getCheckinPage(ctx.profile);
  const s = data.currentStats;
  const na = t.checkin.stats.noData;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.checkin.title}</h1>
        <p className="text-sm text-muted-foreground">
          {interpolate(t.checkin.weekOf, {
            date: DateTime.fromISO(data.currentWeekStart, { zone: 'utc' }).setLocale(locale).toFormat('d LLL'),
          })}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.checkin.summaryTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <StatBox label={t.checkin.stats.workouts} value={`${s.workoutsCompleted}/${s.workoutsPlanned}`} />
          <StatBox
            label={t.checkin.stats.avgWeight}
            value={s.avgWeightKg === null ? na : `${s.avgWeightKg} kg`}
          />
          <StatBox
            label={t.checkin.stats.weightChange}
            value={s.weightChangeKg === null ? na : `${s.weightChangeKg > 0 ? '+' : ''}${s.weightChangeKg} kg`}
          />
          <StatBox
            label={t.checkin.stats.kcalAdherence}
            value={s.kcalAdherencePct === null ? na : `${s.kcalAdherencePct}%`}
          />
          <StatBox
            label={t.checkin.stats.proteinAdherence}
            value={s.proteinAdherencePct === null ? na : `${s.proteinAdherencePct}%`}
          />
        </CardContent>
      </Card>

      {data.existing?.aiSummary ? (
        <CheckinReview
          weekStart={data.currentWeekStart}
          summary={data.existing.aiSummary}
          proposal={(data.existing.aiProposal as CheckinProposal | null) ?? null}
          status={data.existing.status}
        />
      ) : null}

      <CheckinForm existing={data.existing} />

      <p className="text-center text-xs text-muted-foreground">{t.checkin.recommendation}</p>

      {data.history.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.checkin.history}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y pt-0">
            {data.history.map((h) => (
              <div key={h.id} className="py-2.5">
                <p className="text-sm font-medium">
                  {DateTime.fromJSDate(h.weekStart).setLocale(locale).toFormat('d LLL yyyy')}
                </p>
                {h.aiSummary ? <p className="mt-0.5 text-xs text-muted-foreground">{h.aiSummary}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2.5 text-center">
      <p className="font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
