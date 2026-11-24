'use client';

import { useState, useTransition } from 'react';
import { DecimalInput } from '@/components/form/decimal-input';
import { toast } from 'sonner';
import { ArrowRightLeft, ChevronRight, Copy, Pencil, Trash2 } from 'lucide-react';
import type { MealType } from '@prisma/client';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useT } from '@/i18n/provider';
import { interpolate } from '@/i18n';
import { MEASURE_UNITS, type MacroTotals } from '@/lib/nutrition/food-math';
import { cn } from '@/lib/utils';
import type { DayEntry } from './queries';
import { deleteFoodEntry, duplicateFoodEntry, updateFoodEntry } from './actions';

type Mode = 'view' | 'edit' | 'move';

const MEALS: MealType[] = ['BREAKFAST', 'LUNCH', 'MERIENDA', 'DINNER', 'SNACK'];

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export function EntryRow({ entry, target }: { entry: DayEntry; target: MacroTotals | null }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('view');
  const [removed, setRemoved] = useState(false);
  const [pending, start] = useTransition();
  const [quantity, setQuantity] = useState(entry.quantity);
  const [unit, setUnit] = useState(entry.unit);

  function close() {
    setOpen(false);
    setMode('view');
  }
  function onOpenChange(v: boolean) {
    setOpen(v);
    if (!v) {
      setMode('view');
      setQuantity(entry.quantity);
      setUnit(entry.unit);
    }
  }

  function save() {
    start(async () => {
      const res = await updateFoodEntry({ id: entry.id, quantity, unit });
      if (res.ok) {
        toast.success(t.nutrition.toast.updated);
        setMode('view');
      } else toast.error(t.nutrition.toast.genericError);
    });
  }
  function remove() {
    // Se oculta al instante; si el servidor falla, vuelve a aparecer.
    close();
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
    close();
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
    close();
    start(async () => {
      const res = await duplicateFoodEntry({ id: entry.id });
      if (res.ok) toast.success(t.nutrition.toast.duplicated);
      else toast.error(t.nutrition.toast.genericError);
    });
  }

  if (removed) return null;

  // Aporte de cada macro a las calorías de la porción (4 kcal/g proteína y carbohidratos, 9 kcal/g grasas).
  const fromProtein = entry.proteinG * 4;
  const fromCarbs = entry.carbsG * 4;
  const fromFat = entry.fatG * 9;
  const macroKcal = fromProtein + fromCarbs + fromFat;
  const macros = [
    { key: 'protein', label: t.nutrition.protein, grams: entry.proteinG, fromKcal: fromProtein, goal: target?.proteinG ?? 0, color: 'var(--chart-protein)' },
    { key: 'carbs', label: t.nutrition.carbs, grams: entry.carbsG, fromKcal: fromCarbs, goal: target?.carbsG ?? 0, color: 'var(--chart-carbs)' },
    { key: 'fat', label: t.nutrition.fat, grams: entry.fatG, fromKcal: fromFat, goal: target?.fatG ?? 0, color: 'var(--chart-fat)' },
  ];
  const kcalOfTarget = target && target.kcal > 0 ? pct(entry.kcal, target.kcal) : null;

  // En la lista se ve el alimento con sus gramos y macros; al tocarlo se abre el panel con el detalle y las acciones.
  return (
    <div className={cn(pending && 'opacity-50')}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
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
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="break-words text-lg">{entry.name}</DialogTitle>
            <DialogDescription>
              {[entry.brand, t.nutrition.meals[entry.mealType]].filter(Boolean).join(' · ')}
            </DialogDescription>
          </DialogHeader>

          <div className="-mx-1 flex-1 space-y-5 overflow-y-auto px-1">
            {/* Porción y calorías */}
            <div className="rounded-xl bg-secondary/40 p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{t.nutrition.kcal}</p>
                  <p className="text-3xl font-bold tabular-nums">
                    {entry.kcal} <span className="text-base font-medium text-muted-foreground">kcal</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t.nutrition.detail.portion}</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {entry.quantity} {entry.unit}
                  </p>
                </div>
              </div>
              {kcalOfTarget !== null ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {interpolate(t.nutrition.detail.ofTarget, { pct: kcalOfTarget })}
                </p>
              ) : null}
              {entry.isEstimated ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded bg-warning/15 px-2 py-1 text-xs text-warning">
                  {t.nutrition.detail.estimatedNote}
                </p>
              ) : null}
            </div>

            {/* Macronutrientes */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">{t.nutrition.detail.macros}</h3>
              {macros.map((m) => {
                const share = pct(m.fromKcal, macroKcal);
                const ofTarget = m.goal > 0 ? pct(m.grams, m.goal) : null;
                return (
                  <div key={m.key} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">{m.label}</span>
                      <span className="font-semibold tabular-nums">{m.grams} g</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: m.color }} />
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {interpolate(t.nutrition.detail.ofCalories, { pct: share })}
                      {ofTarget !== null ? ` · ${interpolate(t.nutrition.detail.ofTarget, { pct: ofTarget })}` : ''}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Valores de referencia del alimento */}
            {entry.per100 ? (
              <div className="rounded-xl border p-3 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">{t.nutrition.detail.reference}</p>
                <p className="tabular-nums">
                  {entry.per100.kcal} kcal · P {entry.per100.proteinG} · C {entry.per100.carbsG} · G {entry.per100.fatG}
                </p>
              </div>
            ) : null}

            {mode === 'edit' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DecimalInput
                    value={quantity}
                    onValueChange={(v) => setQuantity(Math.max(0, v ?? 0))}
                    className="h-10 flex-1"
                  />
                  <NativeSelect value={unit} onChange={(e) => setUnit(e.target.value)} className="h-10 w-28">
                    {[unit, ...MEASURE_UNITS.filter((u) => u !== unit)].map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={save} disabled={pending || quantity <= 0}>
                    {t.nutrition.actions.save}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setMode('view');
                      setQuantity(entry.quantity);
                      setUnit(entry.unit);
                    }}
                    disabled={pending}
                  >
                    {t.nutrition.detail.cancel}
                  </Button>
                </div>
              </div>
            ) : null}

            {mode === 'move' ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{t.nutrition.actions.moveTo}</span>
                {MEALS.filter((m) => m !== entry.mealType).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => move(m)}
                    className="rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-secondary/50"
                  >
                    {t.nutrition.meals[m]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Acciones */}
          {mode !== 'edit' ? (
            <div className="grid grid-cols-2 gap-2 border-t pt-4">
              <Button variant="outline" className="gap-1.5" disabled={pending} onClick={() => setMode('edit')}>
                <Pencil className="size-4" />
                {t.nutrition.actions.edit}
              </Button>
              <Button
                variant="outline"
                className="gap-1.5"
                disabled={pending}
                aria-expanded={mode === 'move'}
                onClick={() => setMode((m) => (m === 'move' ? 'view' : 'move'))}
              >
                <ArrowRightLeft className="size-4" />
                {t.nutrition.actions.move}
              </Button>
              <Button variant="outline" className="gap-1.5" disabled={pending} onClick={duplicate}>
                <Copy className="size-4" />
                {t.nutrition.actions.duplicate}
              </Button>
              <Button variant="outline" className="gap-1.5 text-destructive" disabled={pending} onClick={remove}>
                <Trash2 className="size-4" />
                {t.nutrition.actions.deleteE}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
