import { useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityCard } from '@/features/activity/activity-card';
import { WeightChart } from '@/features/progress/weight-chart';
import { WeightDialog, type WeightValues } from '@/features/progress/weight-dialog';
import { WEIGHT_RANGES, WeightHeadline, WeightTrend, type WeightRange } from '@/features/progress/weight-stats';
import { WeightWeekList } from '@/features/progress/weight-week-list';
import type { Dictionary } from '@/i18n';
import { activityView } from '@/lib/activity/view';
import { localTodayISO, weekStartISO } from '@/lib/date';
import { weightSummary } from '@/lib/progress/summary';
import { rangeToDays } from '@/lib/progress/weight';
import type { AppData } from '@/lib/sync/data';
import type { QueuedOperation } from '@/lib/sync/engine';
import { ACTIVITY_DELETE_OP, ACTIVITY_LOG_OP, WEIGHT_DELETE_OP } from '@/lib/sync/progress';
import { weightUnitLabel } from '@/lib/units';
import { cn } from '@/lib/utils';
import { useNow } from '../use-now';

const pendingBadge = <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold normal-case text-warning">sin subir</span>;

const datesOf = (outbox: QueuedOperation[], types: string[]) =>
  new Set(outbox.filter((o) => types.includes(o.type)).map((o) => (o.payload as { date: string }).date));

export function Progress({
  t,
  data,
  outbox,
  onChange,
}: {
  t: Dictionary;
  data: AppData;
  outbox: QueuedOperation[];
  /** Guarda un cambio en el teléfono y trata de subirlo. */
  onChange: (type: string, payload: unknown) => Promise<void>;
}) {
  const now = useNow();
  const todayISO = localTodayISO(data.profile.timezone, DateTime.fromJSDate(now));
  const { weekStart, unitSystem } = data.profile;
  const currentWeekKey = weekStartISO(todayISO, weekStart);
  const [range, setRange] = useState<WeightRange>('30');
  /** null = esta semana, así cambia sola. */
  const [chosenWeek, setChosenWeek] = useState<string | null>(null);
  const week = chosenWeek ?? currentWeekKey;

  const points = useMemo(() => [...data.weights].reverse(), [data.weights]);
  const summary = weightSummary(points, data.goal ?? null, todayISO, rangeToDays(range));
  const unit = weightUnitLabel(unitSystem);
  const pendingWeights = datesOf(outbox, ['weight.log']);
  const pendingSteps = datesOf(outbox, [ACTIVITY_LOG_OP]);

  async function save(type: string, payload: unknown, done: string): Promise<boolean> {
    try {
      await onChange(type, payload);
      toast.success(done);
      return true;
    } catch {
      toast.error('No se pudo guardar en el teléfono. Probá de nuevo.');
      return false;
    }
  }

  async function logWeight(values: WeightValues) {
    if (values.weightKg < 20 || values.weightKg > 500 || !values.date || values.date > todayISO) {
      toast.error(t.progress.invalidWeight);
      return false;
    }
    return save('weight.log', values, t.progress.saved);
  }

  const dialog = (entry?: AppData['weights'][number]) => (
    <WeightDialog
      // Al cambiar el registro, el cuadro arranca con los valores nuevos.
      key={entry ? `${entry.date}:${entry.weightKg}:${entry.note ?? ''}` : todayISO}
      todayISO={todayISO}
      unitSystem={unitSystem}
      defaultDate={entry?.date}
      defaultKg={entry?.weightKg}
      defaultNote={entry?.note}
      trigger={
        entry ? (
          <Button variant="ghost" size="icon" className="size-8" aria-label={t.common.edit}>
            <Pencil className="size-3.5" />
          </Button>
        ) : undefined
      }
      onSubmit={logWeight}
      onInvalid={() => toast.error(t.progress.invalidWeight)}
    />
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t.progress.title}</h1>

      <WeightHeadline t={t} summary={summary} unitSystem={unitSystem} />
      {dialog()}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">{t.progress.title}</CardTitle>
            <div className="flex rounded-lg border bg-secondary p-0.5 text-xs">
              {WEIGHT_RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={range === r}
                  onClick={() => setRange(r)}
                  className={cn('rounded-md px-2 py-1 font-medium', range === r ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}
                >
                  {t.progress.range[r]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <WeightChart data={summary.chart} targetKg={summary.targetKg} unitLabel={unit} />
        </CardContent>
      </Card>

      <WeightTrend t={t} summary={summary} unitSystem={unitSystem} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.progress.entries}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <WeightWeekList
            entries={data.weights}
            week={week}
            currentWeekKey={currentWeekKey}
            weekStart={weekStart}
            unitSystem={unitSystem}
            weekControl={(to, content, { kind, label }) => (
              <button
                type="button"
                aria-label={label}
                onClick={() => setChosenWeek(to === currentWeekKey ? null : to)}
                className={kind === 'current' ? 'text-xs font-medium text-primary' : 'grid size-8 place-items-center rounded-md active:bg-secondary'}
              >
                {content}
              </button>
            )}
            badge={(e) => (pendingWeights.has(e.date) ? pendingBadge : null)}
            actions={(e) => (
              <>
                {dialog(e)}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={t.common.delete}
                  onClick={() => void save(WEIGHT_DELETE_OP, { date: e.date }, t.progress.deleted)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </>
            )}
          />
        </CardContent>
      </Card>

      {data.activity ? (
        <ActivityCard
          data={activityView(data.activity, todayISO)}
          badge={(date) => (pendingSteps.has(date) ? pendingBadge : null)}
          onLog={async (values) => (values.date > todayISO ? false : save(ACTIVITY_LOG_OP, values, t.common.saved))}
          onDelete={(date) => void save(ACTIVITY_DELETE_OP, { date }, t.common.saved)}
          onInvalid={() => toast.error(t.activity.invalid)}
        />
      ) : null}
    </div>
  );
}
