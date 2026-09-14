'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Check, Loader2, Search, Trash2 } from 'lucide-react';
import type { MealType } from '@prisma/client';
import type { BarcodeLookup } from '@/server/nutrition/food-provider';
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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { PhotoPicker } from '@/components/form/photo-picker';
import { useT } from '@/i18n/provider';
import { MEASURE_UNITS, computeEntryMacros } from '@/lib/nutrition/food-math';
import { cn } from '@/lib/utils';
import type { FoodSearchResult } from '@/server/nutrition/food-provider';
import type { MealPhotoEstimate } from './meal-photo-schema';
import {
  addFoodEntry,
  addPhotoMealEntries,
  createCustomFood,
  estimateMealPhotoAction,
  estimateMealTextAction,
  lookupBarcodeAction,
  searchFoodAction,
} from './actions';
import { BarcodeScanner } from './barcode-scanner';

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
  const [tab, setTab] = useState('search');
  const [prefillName, setPrefillName] = useState('');

  function goManual(name?: string) {
    if (name) setPrefillName(name);
    setTab('manual');
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{td.title}</DialogTitle>
      </DialogHeader>
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="w-full">
          <TabsTrigger value="search" className="flex-1 px-1">
            {td.searchTab}
          </TabsTrigger>
          <TabsTrigger value="scan" className="flex-1 px-1">
            {td.scanTab}
          </TabsTrigger>
          <TabsTrigger value="photo" className="flex-1 px-1">
            {td.photoTab}
          </TabsTrigger>
          <TabsTrigger value="describe" className="flex-1 px-1">
            {td.describeTab}
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex-1 px-1">
            {td.manualTab}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="search" className="min-h-0 flex-1 overflow-y-auto">
          <SearchTab date={date} mealType={mealType} onDone={onDone} />
        </TabsContent>
        <TabsContent value="scan" className="min-h-0 flex-1 overflow-y-auto">
          <ScanTab date={date} mealType={mealType} onDone={onDone} onGoManual={goManual} />
        </TabsContent>
        <TabsContent value="photo" className="min-h-0 flex-1 overflow-y-auto">
          <PhotoTab date={date} mealType={mealType} onDone={onDone} />
        </TabsContent>
        <TabsContent value="describe" className="min-h-0 flex-1 overflow-y-auto">
          <DescribeTab date={date} mealType={mealType} onDone={onDone} />
        </TabsContent>
        <TabsContent value="manual" className="min-h-0 flex-1 overflow-y-auto">
          <ManualTab
            date={date}
            mealType={mealType}
            onDone={onDone}
            initialName={prefillName}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ---------------- Escanear código de barras ---------------- */
function ScanTab({
  date,
  mealType,
  onDone,
  onGoManual,
}: {
  date: string;
  mealType: MealType;
  onDone: () => void;
  onGoManual: (name?: string) => void;
}) {
  const t = useT();
  const td = t.nutrition.dialog;
  const [looking, startLookup] = useTransition();
  const [result, setResult] = useState<BarcodeLookup | null>(null);
  const [manualCode, setManualCode] = useState('');

  function handleDetected(code: string) {
    startLookup(async () => {
      try {
        setResult(await lookupBarcodeAction(code));
      } catch {
        setResult({ status: 'error' });
      }
    });
  }

  const manualValid = /^\d{8,14}$/.test(manualCode.trim());

  if (looking) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p className="text-sm">{td.scanLooking}</p>
      </div>
    );
  }

  if (result?.status === 'ok') {
    return (
      <QuantityStep
        food={result.food}
        date={date}
        mealType={mealType}
        onBack={() => setResult(null)}
        onDone={onDone}
      />
    );
  }

  if (result) {
    const msg =
      result.status === 'no_nutriments'
        ? td.scanNoNutriments
        : result.status === 'error'
          ? td.scanError
          : td.scanNotFound;
    const prefill = result.status === 'no_nutriments' ? (result.name ?? undefined) : undefined;
    return (
      <div className="space-y-3 py-8 text-center">
        <p className="text-sm text-muted-foreground">{msg}</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => setResult(null)}>
            {td.scanRetry}
          </Button>
          <Button onClick={() => onGoManual(prefill)}>{td.scanManualCta}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <BarcodeScanner active onDetected={handleDetected} />
      <div className="space-y-1.5">
        <Label htmlFor="manual-barcode" className="text-xs text-muted-foreground">
          {td.scanManualLabel}
        </Label>
        <div className="flex gap-2">
          <Input
            id="manual-barcode"
            inputMode="numeric"
            autoComplete="off"
            placeholder="7790000000000"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.replace(/\D/g, '').slice(0, 14))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manualValid) handleDetected(manualCode.trim());
            }}
          />
          <Button
            variant="secondary"
            disabled={!manualValid}
            onClick={() => handleDetected(manualCode.trim())}
          >
            {td.scanLookupBtn}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Estimar desde foto ---------------- */
interface PhotoRow {
  id: string;
  name: string;
  grams: number;
  base: { grams: number; kcal: number; proteinG: number; carbsG: number; fatG: number };
}

function scale(r: PhotoRow) {
  const f = r.base.grams > 0 ? r.grams / r.base.grams : 0;
  return {
    kcal: Math.round(r.base.kcal * f),
    proteinG: Math.round(r.base.proteinG * f * 10) / 10,
    carbsG: Math.round(r.base.carbsG * f * 10) / 10,
    fatG: Math.round(r.base.fatG * f * 10) / 10,
  };
}

function PhotoTab({
  date,
  mealType,
  onDone,
}: {
  date: string;
  mealType: MealType;
  onDone: () => void;
}) {
  const t = useT();
  const tp = t.nutrition.dialog.photo;
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [estimate, setEstimate] = useState<MealPhotoEstimate | null>(null);
  const [rows, setRows] = useState<PhotoRow[]>([]);
  const [estimating, startEstimate] = useTransition();
  const [adding, startAdd] = useTransition();

  function estimateNow() {
    if (photos.length === 0) return;
    startEstimate(async () => {
      const res = await estimateMealPhotoAction({ photo: photos[0]!, note: note.trim() || undefined });
      if (res.ok && res.data) {
        setEstimate(res.data);
        setRows(
          res.data.items.map((it) => ({
            id: crypto.randomUUID(),
            name: it.name,
            grams: Math.round(it.grams),
            base: { ...it, grams: it.grams },
          })),
        );
        setPhotos([]); // la foto no se guarda: se descarta también del cliente
      } else {
        toast.error(res.error === 'NOT_CONFIGURED' ? tp.notConfigured : tp.estError);
      }
    });
  }

  const total = rows.reduce(
    (a, r) => {
      const s = scale(r);
      return {
        kcal: a.kcal + s.kcal,
        proteinG: a.proteinG + s.proteinG,
        carbsG: a.carbsG + s.carbsG,
        fatG: a.fatG + s.fatG,
      };
    },
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  function add() {
    if (rows.length === 0) return;
    startAdd(async () => {
      const res = await addPhotoMealEntries({
        date,
        mealType,
        items: rows.map((r) => ({ name: r.name.trim(), grams: r.grams, ...scale(r) })),
      });
      if (res.ok) {
        toast.success(t.nutrition.toast.added);
        onDone();
      } else toast.error(t.nutrition.toast.genericError);
    });
  }

  if (estimating) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p className="text-sm">{tp.estimating}</p>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="space-y-3 py-2">
        <p className="text-xs text-muted-foreground">{tp.privacyNote}</p>
        <PhotoPicker
          value={photos}
          onChange={setPhotos}
          max={1}
          labels={{ add: tp.add, remove: t.common.delete, max: tp.max, error: tp.imgError }}
        />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{tp.noteLabel}</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder={tp.notePh}
          />
        </div>
        <Button onClick={estimateNow} disabled={photos.length === 0} className="w-full">
          {tp.estimate}
        </Button>
      </div>
    );
  }

  return (
    <EstimateReview
      estimate={estimate}
      rows={rows}
      setRows={setRows}
      total={total}
      adding={adding}
      onAnother={() => {
        setEstimate(null);
        setRows([]);
        setNote('');
      }}
      onAdd={add}
    />
  );
}

/** Lista editable + totales + acciones, compartida entre foto y descripción. */
function EstimateReview({
  estimate,
  rows,
  setRows,
  total,
  adding,
  onAnother,
  onAdd,
}: {
  estimate: MealPhotoEstimate;
  rows: PhotoRow[];
  setRows: React.Dispatch<React.SetStateAction<PhotoRow[]>>;
  total: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  adding: boolean;
  onAnother: () => void;
  onAdd: () => void;
}) {
  const t = useT();
  const tp = t.nutrition.dialog.photo;
  return (
    <div className="space-y-3 py-2">
      <div>
        <p className="text-sm font-medium">{estimate.title}</p>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant={estimate.confidence === 'low' ? 'warning' : 'secondary'}>
            {tp.confidence[estimate.confidence]}
          </Badge>
          {estimate.note ? (
            <span className="text-xs text-muted-foreground">{estimate.note}</span>
          ) : null}
        </div>
      </div>

      <ul className="divide-y">
        {rows.map((r) => {
          const s = scale(r);
          return (
            <li key={r.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {s.kcal} kcal · P {s.proteinG} · C {s.carbsG} · G {s.fatG}
                </p>
              </div>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={r.grams}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((x) =>
                      x.id === r.id ? { ...x, grams: Math.max(0, parseInt(e.target.value, 10) || 0) } : x,
                    ),
                  )
                }
                className="h-9 w-20 text-center"
              />
              <span className="text-xs text-muted-foreground">g</span>
              <button
                type="button"
                aria-label={t.common.delete}
                onClick={() => setRows((prev) => prev.filter((x) => x.id !== r.id))}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="rounded-lg bg-secondary/60 p-3 text-sm tabular-nums">
        <span className="font-semibold">{total.kcal} kcal</span> · P {Math.round(total.proteinG)} · C{' '}
        {Math.round(total.carbsG)} · G {Math.round(total.fatG)}
      </div>
      <p className="text-xs text-warning">{t.nutrition.estimatedBadge}</p>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onAnother}>
          {tp.another}
        </Button>
        <Button className="flex-1" onClick={onAdd} disabled={adding || rows.length === 0}>
          {adding ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {tp.addToLog}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Describir por texto ---------------- */
function DescribeTab({
  date,
  mealType,
  onDone,
}: {
  date: string;
  mealType: MealType;
  onDone: () => void;
}) {
  const t = useT();
  const tp = t.nutrition.dialog.photo;
  const td = t.nutrition.dialog.describe;
  const [description, setDescription] = useState('');
  const [estimate, setEstimate] = useState<MealPhotoEstimate | null>(null);
  const [rows, setRows] = useState<PhotoRow[]>([]);
  const [estimating, startEstimate] = useTransition();
  const [adding, startAdd] = useTransition();

  function estimateNow() {
    if (description.trim().length < 3) return;
    startEstimate(async () => {
      const res = await estimateMealTextAction({ description: description.trim() });
      if (res.ok && res.data) {
        setEstimate(res.data);
        setRows(
          res.data.items.map((it) => ({
            id: crypto.randomUUID(),
            name: it.name,
            grams: Math.round(it.grams),
            base: { ...it, grams: it.grams },
          })),
        );
      } else {
        toast.error(res.error === 'NOT_CONFIGURED' ? tp.notConfigured : tp.estError);
      }
    });
  }

  const total = rows.reduce(
    (a, r) => {
      const s = scale(r);
      return {
        kcal: a.kcal + s.kcal,
        proteinG: a.proteinG + s.proteinG,
        carbsG: a.carbsG + s.carbsG,
        fatG: a.fatG + s.fatG,
      };
    },
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  function add() {
    if (rows.length === 0) return;
    startAdd(async () => {
      const res = await addPhotoMealEntries({
        date,
        mealType,
        items: rows.map((r) => ({ name: r.name.trim(), grams: r.grams, ...scale(r) })),
      });
      if (res.ok) {
        toast.success(t.nutrition.toast.added);
        onDone();
      } else toast.error(t.nutrition.toast.genericError);
    });
  }

  if (estimating) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p className="text-sm">{td.estimating}</p>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{td.label}</Label>
          <Textarea
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder={td.placeholder}
          />
        </div>
        <Button onClick={estimateNow} disabled={description.trim().length < 3} className="w-full">
          {tp.estimate}
        </Button>
      </div>
    );
  }

  return (
    <EstimateReview
      estimate={estimate}
      rows={rows}
      setRows={setRows}
      total={total}
      adding={adding}
      onAnother={() => {
        setEstimate(null);
        setRows([]);
      }}
      onAdd={add}
    />
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
  initialName = '',
}: {
  date: string;
  mealType: MealType;
  onDone: () => void;
  initialName?: string;
}) {
  const t = useT();
  const td = t.nutrition.dialog;
  const [mode, setMode] = useState<'totals' | 'per100'>('totals');
  const [name, setName] = useState(initialName);
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
