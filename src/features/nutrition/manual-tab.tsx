'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { DecimalInput } from '@/components/form/decimal-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { CreateFoodInput } from './schema';

/** Cargar a mano: los totales de lo que se comió, o un producto nuevo por 100 g. La usan la web y la app. */
export function ManualTab({
  initialName = '',
  barcode,
  onAddTotals,
  onCreateAndAdd,
}: {
  initialName?: string;
  barcode?: string;
  onAddTotals: (name: string, macros: { kcal: number; proteinG: number; carbsG: number; fatG: number }) => Promise<void>;
  /** Guarda el producto en la biblioteca compartida y lo anota. */
  onCreateAndAdd: (food: CreateFoodInput, quantity: number) => Promise<void>;
}) {
  const t = useT();
  const td = t.nutrition.dialog;
  // Un producto escaneado trae los datos por 100 g en la etiqueta: se carga así y queda para todos.
  const [mode, setMode] = useState<'totals' | 'per100'>(barcode ? 'per100' : 'totals');
  const [name, setName] = useState(initialName);
  const [v, setV] = useState({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  const [quantity, setQuantity] = useState(100);
  const [pending, start] = useTransition();

  function submit() {
    if (name.trim().length < 2) {
      toast.error(t.nutrition.toast.genericError);
      return;
    }
    start(async () => {
      if (mode === 'totals') {
        await onAddTotals(name.trim(), v);
        return;
      }
      await onCreateAndAdd(
        {
          name: name.trim(),
          kcalPer100: v.kcal,
          proteinPer100: v.proteinG,
          carbsPer100: v.carbsG,
          fatPer100: v.fatG,
          barcode,
        },
        quantity,
      );
    });
  }

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>{td.manualName}</Label>
        <Input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="inline-flex w-full rounded-lg border bg-secondary p-1 text-sm">
        {(['totals', 'per100'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 font-medium transition-colors',
              mode === m ? 'bg-background shadow-sm' : 'text-muted-foreground',
            )}
          >
            {m === 'totals' ? td.totalsMode : td.byPortion}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FieldNum label={mode === 'totals' ? td.manualKcal : td.manualKcalPer100} value={v.kcal} onChange={(x) => setV({ ...v, kcal: x })} />
        <FieldNum label={mode === 'totals' ? td.manualProtein : td.manualProteinPer100} value={v.proteinG} onChange={(x) => setV({ ...v, proteinG: x })} />
        <FieldNum label={mode === 'totals' ? td.manualCarbs : td.manualCarbsPer100} value={v.carbsG} onChange={(x) => setV({ ...v, carbsG: x })} />
        <FieldNum label={mode === 'totals' ? td.manualFat : td.manualFatPer100} value={v.fatG} onChange={(x) => setV({ ...v, fatG: x })} />
      </div>

      {mode === 'per100' ? (
        <div className="space-y-1.5">
          <Label>{td.quantity} (g)</Label>
          <DecimalInput value={quantity} onValueChange={(v) => setQuantity(v ?? 0)} />
        </div>
      ) : null}

      {mode === 'per100' ? (
        <p className="text-xs text-muted-foreground">{td.manualShared}</p>
      ) : null}

      <Button onClick={submit} className="w-full" disabled={pending}>
        {pending ? td.adding : mode === 'totals' ? td.add : td.createAndAdd}
      </Button>
    </div>
  );
}

function FieldNum({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <DecimalInput value={value} onValueChange={(v) => onChange(Math.max(0, v ?? 0))} />
    </div>
  );
}
