'use client';

import { useState, useTransition } from 'react';
import { DecimalInput } from '@/components/form/decimal-input';
import { toast } from 'sonner';
import { ArrowRightLeft, Check, ChevronDown, Copy, Pencil, Trash2, X } from 'lucide-react';
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
  const [open, setOpen] = useState(false);

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

  // Siempre se ve el alimento con sus gramos y macros; al tocarlo aparecen las acciones.
  return (
    <div className={cn(pending && 'opacity-50')}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setMoving(false);
        }}
        aria-expanded={open}
        className="flex w-full items-center gap-3 py-2.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <span className="block break-words text-sm font-medium">{entry.name}</span>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
            <span>
              {entry.quantity} {entry.unit}
            </span>
            <span>P {entry.proteinG}</span>
            <span>C {entry.carbsG}</span>
            <span>G {entry.fatG}</span>
            {entry.isEstimated ? (
              <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                {t.nutrition.estimatedBadge}
              </span>
            ) : null}
          </div>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{entry.kcal} kcal</span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div className="space-y-2 pb-3">
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              disabled={pending}
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
              {t.nutrition.actions.edit}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              disabled={pending}
              onClick={() => setMoving((v) => !v)}
              aria-expanded={moving}
            >
              <ArrowRightLeft className="size-3.5" />
              {t.nutrition.actions.move}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              disabled={pending}
              onClick={duplicate}
            >
              <Copy className="size-3.5" />
              {t.nutrition.actions.duplicate}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs text-destructive"
              disabled={pending}
              onClick={remove}
            >
              <Trash2 className="size-3.5" />
              {t.nutrition.actions.deleteE}
            </Button>
          </div>
          {moving ? (
            <div className="flex flex-wrap items-center gap-1.5">
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
      ) : null}
    </div>
  );
}
