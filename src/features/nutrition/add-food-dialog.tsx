'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Check, Loader2, Search } from 'lucide-react';
import type { MealType } from '@prisma/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { useT } from '@/i18n/provider';
import { MEASURE_UNITS, computeEntryMacros } from '@/lib/nutrition/food-math';
import { cn } from '@/lib/utils';
import type { FoodSearchResult } from '@/server/nutrition/food-provider';
import { addFoodEntry, createCustomFood, searchFoodAction } from './actions';

export function AddFoodDialog({
  date,
  mealType,
  children,
}: {
  date: string;
  mealType: MealType;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-3">
        <Body date={date} mealType={mealType} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function Body({
  date,
  mealType,
  onDone,
}: {
  date: string;
  mealType: MealType;
  onDone: () => void;
}) {
  const t = useT();
  const td = t.nutrition.dialog;
  return (
    <>
      <DialogHeader>
        <DialogTitle>{td.title}</DialogTitle>
      </DialogHeader>
      <Tabs defaultValue="search" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="w-full">
          <TabsTrigger value="search" className="flex-1">
            {td.searchTab}
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex-1">
            {td.manualTab}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="search" className="min-h-0 flex-1 overflow-y-auto">
          <SearchTab date={date} mealType={mealType} onDone={onDone} />
        </TabsContent>
        <TabsContent value="manual" className="min-h-0 flex-1 overflow-y-auto">
          <ManualTab date={date} mealType={mealType} onDone={onDone} />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ---------------- Buscar ---------------- */
function SearchTab({
  date,
  mealType,
  onDone,
}: {
  date: string;
  mealType: MealType;
  onDone: () => void;
}) {
  const t = useT();
  const td = t.nutrition.dialog;
  const [q, setQ] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [searching, startSearch] = useTransition();
  const [picked, setPicked] = useState<FoodSearchResult | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const h = setTimeout(() => {
      startSearch(async () => {
        try {
          setResults(await searchFoodAction(term));
        } catch {
          setResults([]);
        }
      });
    }, 300);
    return () => clearTimeout(h);
  }, [q]);

  if (picked) {
    return (
      <QuantityStep
        food={picked}
        date={date}
        mealType={mealType}
        onBack={() => setPicked(null)}
        onDone={onDone}
      />
    );
  }

  return (
    <div className="space-y-2 py-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={td.searchPlaceholder}
          className="pl-9"
        />
      </div>
      {searching ? (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : q.trim().length < 2 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{td.searchHint}</p>
      ) : results.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{td.noResults}</p>
      ) : (
        <ul className="divide-y">
          {results.map((f) => (
            <li key={f.id ?? f.name}>
              <button
                onClick={() => setPicked(f)}
                className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-secondary/50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{f.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {f.brand ? `${f.brand} · ` : ''}
                    {Math.round(f.kcalPer100)} kcal {td.per100}
                  </span>
                </span>
                {f.verified ? <Check className="size-4 shrink-0 text-success" /> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuantityStep({
  food,
  date,
  mealType,
  onBack,
  onDone,
}: {
  food: FoodSearchResult;
  date: string;
  mealType: MealType;
  onBack: () => void;
  onDone: () => void;
}) {
  const t = useT();
  const td = t.nutrition.dialog;
  const hasServing = Boolean(food.servingQty && food.servingQty > 0);
  const [quantity, setQuantity] = useState(hasServing ? 1 : 100);
  const [unit, setUnit] = useState<string>(hasServing ? 'porción' : 'g');
  const [pending, start] = useTransition();

  const preview = useMemo(
    () => computeEntryMacros(food, quantity || 0, unit),
    [food, quantity, unit],
  );

  const units = hasServing ? (['porción', 'unidad', 'g'] as const) : MEASURE_UNITS;

  function submit() {
    if (!quantity || quantity <= 0) return;
    start(async () => {
      const res = await addFoodEntry({
        date,
        mealType,
        foodId: food.id,
        quantity,
        unit,
      });
      if (res.ok) {
        toast.success(t.nutrition.toast.added);
        onDone();
      } else {
        toast.error(t.nutrition.toast.genericError);
      }
    });
  }

  return (
    <div className="space-y-4 py-2">
      <div>
        <p className="text-sm font-medium">{food.name}</p>
        {food.brand ? <p className="text-xs text-muted-foreground">{food.brand}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{td.quantity}</Label>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={Number.isFinite(quantity) ? quantity : ''}
            onChange={(e) => setQuantity(parseFloat(e.target.value))}
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
        <Button onClick={submit} className="flex-1" disabled={pending || !quantity}>
          {pending ? td.adding : td.add}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Manual ---------------- */
function ManualTab({
  date,
  mealType,
  onDone,
}: {
  date: string;
  mealType: MealType;
  onDone: () => void;
}) {
  const t = useT();
  const td = t.nutrition.dialog;
  const [mode, setMode] = useState<'totals' | 'per100'>('totals');
  const [name, setName] = useState('');
  const [v, setV] = useState({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  const [quantity, setQuantity] = useState(100);
  const [pending, start] = useTransition();
  const num = (x: string) => Math.max(0, parseFloat(x) || 0);

  function submit() {
    if (name.trim().length < 2) {
      toast.error(t.nutrition.toast.genericError);
      return;
    }
    start(async () => {
      if (mode === 'totals') {
        const res = await addFoodEntry({
          date,
          mealType,
          customName: name.trim(),
          quantity: 1,
          unit: t.nutrition.dialog.serving,
          manualMacros: v,
        });
        if (res.ok) {
          toast.success(t.nutrition.toast.added);
          onDone();
        } else toast.error(t.nutrition.toast.genericError);
        return;
      }
      const created = await createCustomFood({
        name: name.trim(),
        kcalPer100: v.kcal,
        proteinPer100: v.proteinG,
        carbsPer100: v.carbsG,
        fatPer100: v.fatG,
      });
      if (!created.ok || !created.data) {
        toast.error(t.nutrition.toast.genericError);
        return;
      }
      const res = await addFoodEntry({
        date,
        mealType,
        foodId: created.data.id,
        quantity,
        unit: 'g',
      });
      if (res.ok) {
        toast.success(t.nutrition.toast.added);
        onDone();
      } else toast.error(t.nutrition.toast.genericError);
    });
  }

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>{td.manualName}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
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
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(num(e.target.value))}
          />
        </div>
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
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={value}
        onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
      />
    </div>
  );
}
