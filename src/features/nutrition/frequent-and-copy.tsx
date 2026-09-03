'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { DateTime } from 'luxon';
import type { MealType } from '@prisma/client';
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
import { interpolate } from '@/i18n';
import type { FrequentMeal } from './queries';
import { addMealToDay, copyDay, saveMealFromDay } from './actions';

export function SaveFrequentDialog({
  date,
  mealType,
  defaultName,
  children,
}: {
  date: string;
  mealType: MealType;
  defaultName: string;
  children: React.ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [pending, start] = useTransition();

  function submit() {
    if (name.trim().length < 2) return;
    start(async () => {
      const res = await saveMealFromDay({ date, mealType, name: name.trim() });
      if (res.ok) {
        toast.success(t.nutrition.toast.savedFrequent);
        setOpen(false);
      } else toast.error(t.nutrition.toast.genericError);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.nutrition.saveFrequentTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>{t.nutrition.frequentNameLabel}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <Button onClick={submit} disabled={pending || name.trim().length < 2}>
          {pending ? t.common.saving : t.common.save}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function FrequentPickDialog({
  date,
  mealType,
  meals,
  children,
}: {
  date: string;
  mealType: MealType;
  meals: FrequentMeal[];
  children: React.ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function pick(mealId: string) {
    start(async () => {
      const res = await addMealToDay({ mealId, date, mealType });
      if (res.ok) {
        toast.success(t.nutrition.toast.added);
        setOpen(false);
      } else toast.error(t.nutrition.toast.genericError);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.nutrition.frequentPickTitle}</DialogTitle>
        </DialogHeader>
        {meals.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t.nutrition.frequentEmpty}
          </p>
        ) : (
          <ul className="max-h-72 divide-y overflow-y-auto">
            {meals.map((m) => (
              <li key={m.id}>
                <button
                  disabled={pending}
                  onClick={() => pick(m.id)}
                  className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-secondary/50 disabled:opacity-50"
                >
                  <span className="text-sm font-medium">{m.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {interpolate(t.nutrition.frequentItems, { n: m.itemCount, kcal: m.kcal })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CopyDayDialog({
  toDate,
  todayISO,
  children,
}: {
  toDate: string;
  todayISO: string;
  children: React.ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(
    DateTime.fromISO(toDate, { zone: 'utc' }).minus({ days: 1 }).toISODate()!,
  );
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const res = await copyDay({ fromDate: from, toDate });
      if (res.ok) {
        toast.success(interpolate(t.nutrition.copyDone, { n: res.data?.count ?? 0 }));
        setOpen(false);
      } else toast.error(t.nutrition.toast.genericError);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.nutrition.copyTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>{t.nutrition.copyFromLabel}</Label>
          <Input
            type="date"
            value={from}
            max={todayISO}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <Button onClick={submit} disabled={pending || from === toDate}>
          {pending ? t.common.loading : t.common.confirm}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
