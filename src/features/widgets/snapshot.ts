import 'server-only';
import { DateTime } from 'luxon';
import type { UserContext } from '@/server/context';
import { can, limitsFor } from '@/server/entitlements';
import { getT } from '@/i18n/server';
import type { Dictionary } from '@/i18n';
import { addDaysISO } from '@/lib/date';
import { displayWeightDelta } from '@/lib/units';
import { getDashboardData } from '@/features/dashboard/queries';
import { computeWeekStats, getCheckinStatus } from '@/features/checkin/queries';
import type { WidgetSnapshot } from './types';

/** Aplana `{ review: { due: '…' } }` en `{ 'review.due': '…' }`. */
function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else if (v && typeof v === 'object') Object.assign(out, flatten(v as Record<string, unknown>, key));
  }
  return out;
}

function widgetStrings(t: Dictionary): Record<string, string> {
  return flatten(t.widgets as unknown as Record<string, unknown>);
}

/** Datos para los widgets del teléfono: lo de hoy y el estado de la revisión semanal. */
export async function buildWidgetSnapshot(ctx: UserContext): Promise<WidgetSnapshot> {
  const { t, locale } = await getT();
  const profile = ctx.profile;

  // Secuencial a propósito: DATABASE_URL usa connection_limit=1 (dos $transaction en paralelo se pisan).
  const data = await getDashboardData(profile);
  const hasReview = can(ctx.entitlement, 'weekly_checkin');
  const everyWeeks = Math.max(1, limitsFor(ctx.entitlement).checkinEveryWeeks);
  const status = await getCheckinStatus(profile, everyWeeks);
  const week = await computeWeekStats(profile, status.weekStartISO);

  // Fecha de la revisión dentro de la semana en curso (el día elegido es 1 lunes … 7 domingo).
  const startWeekday = DateTime.fromISO(status.weekStartISO, { zone: 'utc' }).weekday;
  const offset = (status.dayOfWeek - startWeekday + 7) % 7;
  const dayISO = addDaysISO(status.weekStartISO, offset);
  const nextDayISO = addDaysISO(dayISO, status.submitted ? 7 * everyWeeks : 7);
  const dayName = (iso: string) =>
    DateTime.fromISO(iso, { zone: 'utc' }).setLocale(locale).toFormat('cccc');

  const wk = data.training.kind === 'workout' ? data.training : null;
  const planned = data.training.kind === 'planned' ? data.training : null;

  const unit = profile.unitSystem === 'IMPERIAL' ? 'lb' : 'kg';
  const weightChange =
    week.weightChangeKg != null
      ? (() => {
          const v = displayWeightDelta(week.weightChangeKg, profile.unitSystem).value;
          return `${v > 0 ? '+' : ''}${v} ${unit}`;
        })()
      : null;

  return {
    v: 1,
    updatedAt: new Date().toISOString(),
    todayISO: data.todayISO,
    strings: widgetStrings(t),
    today: {
      kcalTarget: data.nutrition.target?.kcal ?? null,
      kcalEaten: data.nutrition.consumed.kcal,
      proteinTarget: data.nutrition.target?.proteinG ?? null,
      proteinEaten: data.nutrition.consumed.proteinG,
      workout: wk
        ? wk.status === 'SKIPPED'
          ? null
          : { name: wk.name, state: wk.status === 'COMPLETED' ? 'done' : wk.status === 'ACTIVE' ? 'active' : 'planned' }
        : planned
          ? { name: planned.name, state: 'planned' }
          : null,
      streak: data.progress.streak,
    },
    review: {
      status: !hasReview ? 'locked' : !status.enabled ? 'off' : 'active',
      dayISO,
      dayName: dayName(dayISO),
      nextDayISO,
      nextDayName: dayName(nextDayISO),
      weekEndISO: addDaysISO(status.weekStartISO, 7),
      done: status.done,
      dueNow: hasReview && status.enabled && !status.done && status.dayReached,
      week: {
        workouts: week.workoutsCompleted,
        planned: week.workoutsPlanned,
        dietPct: week.kcalAdherencePct,
        weightChange,
      },
    },
  };
}
