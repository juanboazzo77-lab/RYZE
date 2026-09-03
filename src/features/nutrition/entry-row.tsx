'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Pencil, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  const [pending, start] = useTransition();
  const [quantity, setQuantity] = useState(entry.quantity);
  const [unit, setUnit] = useState(entry.unit);

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
    start(async () => {
      const res = await deleteFoodEntry({ id: entry.id });
      if (res.ok) toast.success(t.nutrition.toast.deleted);
      else toast.error(t.nutrition.toast.genericError);
    });
  }
  function duplicate() {
    start(async () => {
      const res = await duplicateFoodEntry({ id: entry.id });
      if (res.ok) toast.success(t.nutrition.toast.duplicated);
      else toast.error(t.nutrition.toast.genericError);
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{entry.name}</span>
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(0, parseFloat(e.target.value) || 0))}
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
    <div className={cn('group flex items-center gap-3 py-2', pending && 'opacity-50')}>
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
  );
}
