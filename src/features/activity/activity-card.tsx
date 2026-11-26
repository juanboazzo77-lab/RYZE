'use client';

import { useState, useTransition } from 'react';
import { Footprints, Plus, Trash2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ProgressLineChart, type ChartPoint } from '@/components/charts/progress-line-chart';
import { useI18n, useT } from '@/i18n/provider';
import { stepLevel } from '@/lib/activity/steps';
import type { ActivityView } from '@/lib/activity/view';
import { logActivitySchema, type LogActivityInput } from './schema';

/** La tarjeta de pasos. La usan la web y la app; cada una dice cómo se guarda y se borra. */

const intl = (locale: string) => new Intl.NumberFormat(locale === 'es' ? 'es-AR' : 'en-US');

export function ActivityCard({
  data,
  dimmed,
  badge,
  onLog,
  onDelete,
  onInvalid,
}: {
  data: ActivityView;
  dimmed?: boolean;
  badge?: (date: string) => React.ReactNode;
  /** Devuelve true si se guardó. */
  onLog: (values: LogActivityInput) => Promise<boolean>;
  onDelete: (date: string) => void;
  onInvalid: () => void;
}) {
  const t = useT();
  const { locale } = useI18n();
  const ta = t.activity;
  const fmt = intl(locale);

  const level = stepLevel(data.avg7);
  const points: ChartPoint[] = data.series.map((s) => ({
    label: DateTime.fromISO(s.date, { zone: 'utc' }).setLocale(locale).toFormat('d LLL'),
    value: s.steps,
  }));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Footprints className="size-4 text-primary" />
          {ta.title}
        </CardTitle>
        <LogActivityDialog todayISO={data.todayISO} defaultSteps={data.todaySteps} onLog={onLog} onInvalid={onInvalid} />
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <Stat label={ta.today} value={data.todaySteps} fmt={fmt} />
          <Stat label={ta.avg7} value={data.avg7} fmt={fmt} />
          <Stat label={ta.avg30} value={data.avg30} fmt={fmt} />
        </div>

        <p className="text-xs text-muted-foreground">
          {ta.level}: <span className="font-medium text-foreground">{ta.levels[level]}</span>
        </p>

        {points.length >= 2 ? <ProgressLineChart data={points} height={180} /> : null}

        {data.recent.length > 0 ? (
          <ul className="divide-y text-sm">
            {data.recent.map((r) => (
              <li key={r.date} className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2 capitalize text-muted-foreground">
                  {DateTime.fromISO(r.date, { zone: 'utc' }).setLocale(locale).toFormat('ccc d LLL')}
                  {badge?.(r.date)}
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums font-medium">{fmt.format(r.steps)}</span>
                  <button
                    type="button"
                    onClick={() => onDelete(r.date)}
                    disabled={dimmed}
                    aria-label={t.common.delete}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">{ta.empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, fmt }: { label: string; value: number | null; fmt: Intl.NumberFormat }) {
  return (
    <div className="rounded-lg border p-2">
      <p className="font-semibold tabular-nums">{value === null ? '—' : fmt.format(value)}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function LogActivityDialog({
  todayISO,
  defaultSteps,
  onLog,
  onInvalid,
}: {
  todayISO: string;
  defaultSteps: number | null;
  onLog: (values: LogActivityInput) => Promise<boolean>;
  onInvalid: () => void;
}) {
  const t = useT();
  const ta = t.activity;
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO);
  const [steps, setSteps] = useState(defaultSteps != null ? String(defaultSteps) : '');
  const [minutes, setMinutes] = useState('');
  const [pending, start] = useTransition();

  function submit() {
    const s = Number.parseInt(steps, 10);
    const m = minutes.trim() ? Number.parseInt(minutes, 10) : null;
    const values = logActivitySchema.safeParse({ date, steps: s, activeMinutes: Number.isFinite(m as number) ? m : null });
    if (!values.success) {
      onInvalid();
      return;
    }
    start(async () => {
      if (await onLog(values.data)) setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus className="size-4" />
          {ta.log}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ta.log}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{ta.date}</Label>
            <Input type="date" value={date} max={todayISO} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{ta.steps}</Label>
            <Input type="number" inputMode="numeric" min={0} autoFocus value={steps} onChange={(e) => setSteps(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>
            {ta.activeMinutes} ({t.common.optional})
          </Label>
          <Input type="number" inputMode="numeric" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </div>
        <Button onClick={submit} disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
