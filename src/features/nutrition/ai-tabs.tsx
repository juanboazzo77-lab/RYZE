'use client';

import { useState, useTransition, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { toast } from 'sonner';
import { Check, Loader2, Trash2 } from 'lucide-react';
import type { BarcodeLookup, FoodSearchResult } from '@/server/nutrition/food-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { PhotoPicker } from '@/components/form/photo-picker';
import { useT } from '@/i18n/provider';
import { uuid } from '@/lib/sync/engine';
import type { MealPhotoEstimate } from './meal-photo-schema';
import { BarcodeScanner } from './barcode-scanner';

/**
 * Escanear, foto y describir. Las usan la web y la app: cada una dice cómo se le pide algo al servidor y cómo se anota.
 */

export interface EstimateItem {
  name: string;
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface EstimateResult {
  ok?: boolean;
  error?: string;
  data?: MealPhotoEstimate;
}

interface EstimateProps {
  /** Anota lo estimado; devuelve si se pudo. Los avisos los muestra quien lo implementa. */
  onAdd: (items: EstimateItem[]) => Promise<boolean>;
  /** Un texto propio para un error (por ejemplo, sin señal en la app). */
  errorText?: (code: string | undefined) => string | undefined;
}

/* ---------------- Escanear código de barras ---------------- */
export function ScanTab({
  lookup,
  renderFood,
  onGoManual,
}: {
  lookup: (code: string) => Promise<BarcodeLookup>;
  /** Elegir la cantidad del producto encontrado. */
  renderFood: (food: FoodSearchResult, onBack: () => void) => ReactNode;
  onGoManual: (name?: string, barcode?: string) => void;
}) {
  const t = useT();
  const td = t.nutrition.dialog;
  const [looking, startLookup] = useTransition();
  const [result, setResult] = useState<BarcodeLookup | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [lastCode, setLastCode] = useState<string | undefined>(undefined);

  function handleDetected(code: string) {
    setLastCode(code);
    startLookup(async () => {
      try {
        setResult(await lookup(code));
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
    return <>{renderFood(result.food, () => setResult(null))}</>;
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
          <Button onClick={() => onGoManual(prefill, lastCode)}>{td.scanManualCta}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <BarcodeScanner active fill onDetected={handleDetected} />
      <div className="shrink-0 space-y-1.5">
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

/* ---------------- Lo estimado por la IA ---------------- */
interface PhotoRow {
  id: string;
  name: string;
  grams: number;
  base: EstimateItem;
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

/** Pedir una estimación, corregir las cantidades y anotarla: igual para la foto y para la descripción. */
function useEstimate({ onAdd, errorText }: EstimateProps) {
  const t = useT();
  const tp = t.nutrition.dialog.photo;
  const [estimate, setEstimate] = useState<MealPhotoEstimate | null>(null);
  const [rows, setRows] = useState<PhotoRow[]>([]);
  const [estimating, startEstimate] = useTransition();
  const [adding, startAdd] = useTransition();

  function run(request: () => Promise<EstimateResult>, onOk?: () => void) {
    startEstimate(async () => {
      const res = await request().catch((): EstimateResult => ({}));
      if (res.ok && res.data) {
        setEstimate(res.data);
        setRows(
          res.data.items.map((it) => ({
            id: uuid(),
            name: it.name,
            grams: Math.round(it.grams),
            base: { ...it, grams: it.grams },
          })),
        );
        onOk?.();
      } else {
        toast.error(
          errorText?.(res.error) ??
            (res.error === 'NOT_CONFIGURED'
              ? tp.notConfigured
              : res.error === 'LIMIT'
                ? t.nutrition.mealPlan.limitReached
                : tp.estError),
        );
      }
    });
  }

  function add() {
    if (rows.length === 0) return;
    startAdd(async () => {
      await onAdd(rows.map((r) => ({ name: r.name.trim(), grams: r.grams, ...scale(r) })));
    });
  }

  function reset() {
    setEstimate(null);
    setRows([]);
  }

  return { estimate, rows, setRows, estimating, adding, run, add, reset };
}

/** Lista editable + totales + acciones, compartida entre foto y descripción. */
function EstimateReview({
  estimate,
  rows,
  setRows,
  adding,
  onAnother,
  onAdd,
}: {
  estimate: MealPhotoEstimate;
  rows: PhotoRow[];
  setRows: Dispatch<SetStateAction<PhotoRow[]>>;
  adding: boolean;
  onAnother: () => void;
  onAdd: () => void;
}) {
  const t = useT();
  const tp = t.nutrition.dialog.photo;
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

function Estimating({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

/* ---------------- Estimar desde foto ---------------- */
export function PhotoTab({
  estimatePhoto,
  ...props
}: EstimateProps & { estimatePhoto: (input: { photo: string; note?: string }) => Promise<EstimateResult> }) {
  const t = useT();
  const tp = t.nutrition.dialog.photo;
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const { estimate, rows, setRows, estimating, adding, run, add, reset } = useEstimate(props);

  function estimateNow() {
    if (photos.length === 0) return;
    run(
      () => estimatePhoto({ photo: photos[0]!, note: note.trim() || undefined }),
      () => setPhotos([]), // la foto no se guarda: se descarta también del cliente
    );
  }

  if (estimating) return <Estimating text={tp.estimating} />;

  if (!estimate) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <PhotoPicker
          large
          value={photos}
          onChange={setPhotos}
          max={1}
          labels={{ add: tp.add, remove: t.common.delete, max: tp.max, error: tp.imgError }}
        />
        <p className="shrink-0 text-center text-xs text-muted-foreground">{tp.privacyNote}</p>
        <div className="shrink-0 space-y-1.5">
          <Label className="text-xs text-muted-foreground">{tp.noteLabel}</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder={tp.notePh}
          />
        </div>
        <Button onClick={estimateNow} disabled={photos.length === 0} className="h-12 w-full shrink-0 rounded-xl text-base font-semibold">
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
      adding={adding}
      onAnother={() => {
        reset();
        setNote('');
      }}
      onAdd={add}
    />
  );
}

/* ---------------- Describir por texto ---------------- */
export function DescribeTab({
  estimateText,
  ...props
}: EstimateProps & { estimateText: (input: { description: string }) => Promise<EstimateResult> }) {
  const t = useT();
  const tp = t.nutrition.dialog.photo;
  const td = t.nutrition.dialog.describe;
  const [description, setDescription] = useState('');
  const { estimate, rows, setRows, estimating, adding, run, add, reset } = useEstimate(props);

  function estimateNow() {
    if (description.trim().length < 3) return;
    run(() => estimateText({ description: description.trim() }));
  }

  if (estimating) return <Estimating text={td.estimating} />;

  if (!estimate) {
    return (
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{td.label}</Label>
          <Textarea
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
    <EstimateReview estimate={estimate} rows={rows} setRows={setRows} adding={adding} onAnother={reset} onAdd={add} />
  );
}
