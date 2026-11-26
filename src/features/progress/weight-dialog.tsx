'use client';

import { useState, useTransition } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DecimalInput } from '@/components/form/decimal-input';
import { useT } from '@/i18n/provider';
import { kgToLb, lbToKg } from '@/lib/units';

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface WeightValues {
  date: string;
  weightKg: number;
  note?: string;
}

/** El cuadro para cargar o corregir un peso. Lo usan la web y la app; cada una dice cómo se guarda. */
export function WeightDialog({
  todayISO,
  unitSystem,
  defaultDate,
  defaultKg,
  defaultNote,
  trigger,
  onSubmit,
  onInvalid,
}: {
  todayISO: string;
  unitSystem: 'METRIC' | 'IMPERIAL';
  defaultDate?: string;
  defaultKg?: number | null;
  defaultNote?: string | null;
  trigger?: React.ReactNode;
  /** Devuelve true si se guardó (recién ahí se cierra). */
  onSubmit: (values: WeightValues) => Promise<boolean>;
  onInvalid: () => void;
}) {
  const t = useT();
  const imperial = unitSystem === 'IMPERIAL';
  const unit = imperial ? 'lb' : 'kg';
  const shown = (kg: number | null | undefined) => (kg != null ? round1(imperial ? kgToLb(kg) : kg) : null);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(defaultDate ?? todayISO);
  const [weight, setWeight] = useState<number | null>(shown(defaultKg));
  const [note, setNote] = useState(defaultNote ?? '');
  const [pending, start] = useTransition();

  const nudge = (delta: number) => setWeight((w) => Math.max(0, round1((w ?? 0) + delta)));

  function submit() {
    if (weight == null || weight <= 0) {
      onInvalid();
      return;
    }
    const weightKg = round1(imperial ? lbToKg(weight) : weight);
    start(async () => {
      if (await onSubmit({ date, weightKg, note: note.trim() || undefined })) setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="w-full">
            <Plus className="size-4" />
            {t.progress.logWeight}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
        <DialogHeader>
          <DialogTitle>{t.progress.logWeight}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label="-0,1"
            onClick={() => nudge(-0.1)}
            className="grid size-10 shrink-0 place-items-center rounded-full border text-muted-foreground active:bg-secondary"
          >
            <Minus className="size-4" />
          </button>
          <div className="flex min-w-0 items-baseline justify-center gap-1">
            <DecimalInput
              autoFocus
              maxDecimals={1}
              placeholder="0,0"
              value={weight}
              onValueChange={setWeight}
              aria-label={`${t.progress.weight} (${unit})`}
              className="h-12 w-28 border-0 bg-transparent px-0 text-center text-4xl font-bold tabular-nums shadow-none focus-visible:ring-0"
            />
            <span className="text-base font-medium text-muted-foreground">{unit}</span>
          </div>
          <button
            type="button"
            aria-label="+0,1"
            onClick={() => nudge(0.1)}
            className="grid size-10 shrink-0 place-items-center rounded-full border text-muted-foreground active:bg-secondary"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Label className="shrink-0 text-xs text-muted-foreground">{t.progress.date}</Label>
          <Input
            type="date"
            value={date}
            max={todayISO}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 min-w-0 flex-1 py-0 text-sm"
          />
        </div>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder={`${t.progress.note} (${t.common.optional})`}
          className="h-9 text-sm"
        />

        <Button onClick={submit} disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
