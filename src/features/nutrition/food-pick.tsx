'use client';

import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { DecimalInput } from '@/components/form/decimal-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useT } from '@/i18n/provider';
import { MEASURE_UNITS, computeEntryMacros, type FoodLike } from '@/lib/nutrition/food-math';
import { cn } from '@/lib/utils';

/** Elegir un alimento y su cantidad. Estas piezas las usan la web y la app. */

export function FoodResultList<T extends { id: string | null; name: string; brand: string | null; kcalPer100: number; verified: boolean }>({
  foods,
  per100,
  onPick,
}: {
  foods: T[];
  per100: string;
  onPick: (food: T) => void;
}) {
  return (
    <ul className="divide-y">
      {foods.map((f) => (
        <li key={f.id ?? f.name}>
          <button
            type="button"
            onClick={() => onPick(f)}
            className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-secondary/50"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{f.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {f.brand ? `${f.brand} · ` : ''}
                {Math.round(f.kcalPer100)} kcal {per100}
              </span>
            </span>
            {f.verified ? <Check className="size-4 shrink-0 text-success" /> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function QuantityView({
  food,
  initial,
  pending,
  onBack,
  onAdd,
}: {
  food: FoodLike & { name: string; brand: string | null; servingLabel: string | null };
  /** Cantidad y unidad para arrancar (por ejemplo, las de la última vez). */
  initial?: { quantity: number; unit: string };
  pending: boolean;
  onBack: () => void;
  onAdd: (quantity: number, unit: string) => void;
}) {
  const t = useT();
  const td = t.nutrition.dialog;
  const hasServing = Boolean(food.servingQty && food.servingQty > 0);
  const [quantity, setQuantity] = useState(initial?.quantity ?? (hasServing ? 1 : 100));
  const [unit, setUnit] = useState<string>(initial?.unit ?? (hasServing ? 'porción' : 'g'));

  const preview = useMemo(
    () => computeEntryMacros(food, quantity || 0, unit),
    [food, quantity, unit],
  );

  const offered: readonly string[] = hasServing ? ['porción', 'unidad', 'g'] : MEASURE_UNITS;
  const units = offered.includes(unit) ? offered : [unit, ...offered];

  return (
    <div className="space-y-4 py-2">
      <div>
        <p className="text-sm font-medium">{food.name}</p>
        {food.brand ? <p className="text-xs text-muted-foreground">{food.brand}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{td.quantity}</Label>
          <DecimalInput
            value={Number.isFinite(quantity) ? quantity : null}
            onValueChange={(v) => setQuantity(v ?? NaN)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{td.unit}</Label>
          <NativeSelect value={unit} onChange={(e) => setUnit(e.target.value)}>
            {units.map((u) => (
              <option key={u} value={u}>
                {u === 'porción' && food.servingLabel ? `${u} (${food.servingLabel})` : u}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="rounded-lg bg-secondary/60 p-3 text-sm">
        <p className="mb-1 text-xs text-muted-foreground">
          {td.previewFor.replace('{q}', String(quantity || 0)).replace('{u}', unit)}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
          <span className="font-semibold">{preview.kcal} kcal</span>
          <span>P {preview.proteinG} g</span>
          <span>C {preview.carbsG} g</span>
          <span>G {preview.fatG} g</span>
        </div>
        {preview.isEstimated ? (
          <p className={cn('mt-1 text-xs text-warning')}>{t.nutrition.estimatedBadge}</p>
        ) : null}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={pending}>
          {t.common.back}
        </Button>
        <Button
          onClick={() => {
            if (quantity > 0) onAdd(quantity, unit);
          }}
          className="flex-1"
          disabled={pending || !(quantity > 0)}
        >
          {pending ? td.adding : td.add}
        </Button>
      </div>
    </div>
  );
}
