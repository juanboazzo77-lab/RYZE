'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { kgToLb, lbToKg } from '@/lib/units';
import type { UnitSystem } from '@prisma/client';
import { logWeight } from './actions';

const round1 = (n: number) => Math.round(n * 10) / 10;

export function LogWeightDialog({
  todayISO,
  unitSystem,
  defaultDate,
  defaultKg,
  defaultNote,
  trigger,
}: {
  todayISO: string;
  unitSystem: UnitSystem;
  defaultDate?: string;
  defaultKg?: number | null;
  defaultNote?: string | null;
  trigger?: React.ReactNode;
}) {
  const t = useT();
  const imperial = unitSystem === 'IMPERIAL';
  const unit = imperial ? 'lb' : 'kg';
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(defaultDate ?? todayISO);
  const [display, setDisplay] = useState<string>(
    defaultKg != null ? String(round1(imperial ? kgToLb(defaultKg) : defaultKg)) : '',
  );
  const [note, setNote] = useState(defaultNote ?? '');
  const [pending, start] = useTransition();

  function submit() {
    const v = parseFloat(display);
    if (!Number.isFinite(v) || v <= 0) {
      toast.error(t.progress.invalidWeight);
      return;
    }
    const weightKg = round1(imperial ? lbToKg(v) : v);
    start(async () => {
      const res = await logWeight({ date, weightKg, note: note.trim() || undefined });
      if (res.ok) {
        toast.success(t.progress.saved);
        setOpen(false);
      } else toast.error(t.progress.genericError);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.progress.logWeight}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t.progress.date}</Label>
            <Input
              type="date"
              value={date}
              max={todayISO}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              {t.progress.weight} ({unit})
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0}
              autoFocus
              value={display}
              onChange={(e) => setDisplay(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>
            {t.progress.note} ({t.common.optional})
          </Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </div>
        <Button onClick={submit} disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
