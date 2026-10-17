'use client';

import { useState, useTransition } from 'react';
import { DecimalInput } from '@/components/form/decimal-input';
import { toast } from 'sonner';
import { ArrowRightLeft, Check, Copy, Pencil, Trash2, X } from 'lucide-react';
import type { MealType } from '@prisma/client';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { MEASURE_UNITS } from '@/lib/nutrition/food-math';
import { cn } from '@/lib/utils';
import type { DayEntry } from './queries';
import { deleteFoodEntry, duplicateFoodEntry, updateFoodEntry } from './actions';

export function EntryRow({ entry }: { entry: DayEntry }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [pending, start] = useTransition();
  const [quantity, setQuantity] = useState(entry.quantity);
  const [unit, setUnit] = useState(entry.unit);
  const [moving, setMoving] = useState(false);

  function save() {
    start(async () => {
      const res = await updateFoodEntry({ id: entry.id, quantity, unit });
      if (res.ok) {
        toast.success(t.nutrition.toast.updated);
        setEditing(false);
      } else toast.error(t.nutrition.toast.genericError);
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
    if (to === entry.mealType) return;
    // Se saca de acá al instante y aparece en la otra comida cuando la pantalla se refresca.
    setMoving(false);
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

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{entry.name}</span>
        <DecimalInput
          value={quantity}
          onValueChange={(v) => setQuantity(Math.max(0, v ?? 0))}
          className="h-8 w-20"
        />
        <NativeSelect
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="h-8 w-24"
        >
          {[unit, ...MEASURE_UNITS.filter((u) => u !== unit)].map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </NativeSelect>
        <Button size="icon" variant="ghost" className="size-8" onClick={save} disabled={pending}>
          <Check className="size-4 text-success" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          onClick={() => setEditing(false)}
          disabled={pending}
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(pending && 'opacity-50')}>
    <div className="group flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{entry.name}</span>
          {entry.isEstimated ? (
            <span className="shrink-0 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
              {t.nutrition.estimatedBadge}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {entry.quantity} {entry.unit} · P {entry.proteinG} · C {entry.carbsG} · G {entry.fatG}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{entry.kcal} kcal</span>
      <div className="flex shrink-0 items-center opacity-60 transition-opacity group-hover:opacity-100">
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          disabled={pending}
          onClick={() => setEditing(true)}
          aria-label={t.nutrition.actions.edit}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          disabled={pending}
          onClick={() => setMoving((v) => !v)}
          aria-label={t.nutrition.actions.move}
          aria-expanded={moving}
        >
          <ArrowRightLeft className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          disabled={pending}
          onClick={duplicate}
          aria-label={t.nutrition.actions.duplicate}
        >
          <Copy className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          disabled={pending}
          onClick={remove}
          aria-label={t.nutrition.actions.deleteE}
        >
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>
    </div>
    {moving ? (
      <div className="flex flex-wrap items-center gap-1.5 pb-2">
        <span className="text-xs text-muted-foreground">{t.nutrition.actions.moveTo}</span>
        {(['BREAKFAST', 'LUNCH', 'MERIENDA', 'DINNER', 'SNACK'] as const)
          .filter((m) => m !== entry.mealType)
          .map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => move(m)}
              className="rounded-full border px-3 py-1 text-xs font-medium hover:bg-secondary/50"
            >
              {t.nutrition.meals[m]}
            </button>
          ))}
      </div>
    ) : null}
    </div>
  );
}
