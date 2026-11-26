'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { MealType } from '@prisma/client';
import { useT } from '@/i18n/provider';
import type { MacroTotals } from '@/lib/nutrition/food-math';
import type { DayEntry } from './queries';
import { deleteFoodEntry, duplicateFoodEntry, updateFoodEntry } from './actions';
import { EntryItem } from './entry-item';

export function EntryRow({ entry, target }: { entry: DayEntry; target: MacroTotals | null }) {
  const t = useT();
  const [removed, setRemoved] = useState(false);
  const [pending, start] = useTransition();

  function save(quantity: number, unit: string) {
    return new Promise<boolean>((resolve) => {
      start(async () => {
        const res = await updateFoodEntry({ id: entry.id, quantity, unit });
        if (res.ok) toast.success(t.nutrition.toast.updated);
        else toast.error(t.nutrition.toast.genericError);
        resolve(Boolean(res.ok));
      });
    });
  }
  function remove() {
    // Se oculta al instante; si el servidor falla, vuelve a aparecer.
    setRemoved(true);
    start(async () => {
      const res = await deleteFoodEntry({ id: entry.id });
      if (res.ok) toast.success(t.nutrition.toast.deleted);
      else {
        setRemoved(false);
        toast.error(t.nutrition.toast.genericError);
      }
    });
  }
  function move(to: MealType) {
    // Se saca de acá al instante y aparece en la otra comida cuando la pantalla se refresca.
    setRemoved(true);
    start(async () => {
      const res = await updateFoodEntry({ id: entry.id, mealType: to });
      if (res.ok) toast.success(t.nutrition.toast.moved);
      else {
        setRemoved(false);
        toast.error(t.nutrition.toast.genericError);
      }
    });
  }
  function duplicate() {
    start(async () => {
      const res = await duplicateFoodEntry({ id: entry.id });
      if (res.ok) toast.success(t.nutrition.toast.duplicated);
      else toast.error(t.nutrition.toast.genericError);
    });
  }

  if (removed) return null;

  return (
    <EntryItem
      entry={entry}
      target={target}
      pending={pending}
      onSave={save}
      onMove={move}
      onDuplicate={duplicate}
      onDelete={remove}
    />
  );
}
