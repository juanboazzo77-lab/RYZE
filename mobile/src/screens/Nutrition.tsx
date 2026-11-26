import { useState } from 'react';
import { DateTime } from 'luxon';
import { CopyPlus, ListPlus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DayNavBar } from '@/features/nutrition/day-nav-bar';
import { DayTotalsCard } from '@/features/nutrition/day-totals-card';
import { EntryItem } from '@/features/nutrition/entry-item';
import { MealCard } from '@/features/nutrition/meal-card';
import type { Dictionary } from '@/i18n';
import { interpolate } from '@/i18n/interpolate';
import { addDaysISO, localTodayISO } from '@/lib/date';
import type { AppData } from '@/lib/sync/data';
import { uuid, type QueuedOperation } from '@/lib/sync/engine';
import {
  dayData, foodAddSchema, foodUpdateSchema, itemFromEntry, FOOD_ADD_OP, FOOD_DELETE_OP, FOOD_UPDATE_OP, MAX_ITEMS, MEALS,
  type AddItem, type EntryView, type Meal, type Nutrition as NutritionData,
} from '@/lib/sync/nutrition';
import { useNow } from '../use-now';
import { Card } from '../ui';
import { AddFoodSheet } from './AddFood';

/** Lo que tiene cambios sin subir, para marcarlo en la lista. */
function pendingEntries(outbox: QueuedOperation[]): Set<string> {
  const ids = new Set<string>();
  for (const op of outbox) {
    const p = op.payload as { items?: Array<{ id: string }>; entryId?: string };
    if (op.type === FOOD_ADD_OP) for (const item of p.items ?? []) ids.add(item.id);
    if (op.type === FOOD_UPDATE_OP && p.entryId) ids.add(p.entryId);
  }
  return ids;
}

export function Nutrition({
  t,
  data,
  outbox,
  onChange,
}: {
  t: Dictionary;
  data: AppData;
  outbox: QueuedOperation[];
  /** Guarda un cambio en el teléfono y trata de subirlo. */
  onChange: (type: string, payload: unknown) => Promise<void>;
}) {
  const now = useNow();
  const todayISO = localTodayISO(data.profile.timezone, DateTime.fromJSDate(now));
  /** null = hoy, así cambia solo a medianoche. */
  const [chosen, setChosen] = useState<string | null>(null);
  const [addTo, setAddTo] = useState<Meal | null>(null);
  const [savedTo, setSavedTo] = useState<Meal | null>(null);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nutrition = data.nutrition;
  if (!nutrition) {
    return (
      <>
        <h1 className="text-2xl font-bold tracking-tight">{t.nutrition.title}</h1>
        <Card className="text-sm text-muted-foreground">Conectate a internet una vez para bajar tus comidas. Después las ves y las anotás sin señal.</Card>
      </>
    );
  }

  const date = chosen && chosen <= todayISO && chosen >= nutrition.since ? chosen : todayISO;
  const day = dayData(nutrition, date);
  const pending = pendingEntries(outbox);

  async function save(type: string, payload: unknown): Promise<boolean> {
    try {
      await onChange(type, payload);
      setError(null);
      return true;
    } catch {
      setError('No se pudo guardar en el teléfono. Probá de nuevo.');
      return false;
    }
  }

  async function add(items: AddItem[]): Promise<boolean> {
    // En tandas, y todas revisadas antes de guardar la primera: o entran todas o ninguna.
    const batches = [];
    for (let i = 0; i < items.length; i += MAX_ITEMS) {
      const batch = foodAddSchema.safeParse({ date, items: items.slice(i, i + MAX_ITEMS) });
      if (!batch.success) {
        setError('Hay un valor que no es válido. Revisalo.');
        return false;
      }
      batches.push(batch.data);
    }
    for (const batch of batches) if (!(await save(FOOD_ADD_OP, batch))) return false;
    return true;
  }

  async function update(entryId: string, change: { quantity?: number; unit?: string; mealType?: Meal }): Promise<boolean> {
    const payload = foodUpdateSchema.safeParse({ entryId, ...change });
    if (!payload.success) {
      setError('Hay un valor que no es válido. Revisalo.');
      return false;
    }
    return save(FOOD_UPDATE_OP, payload.data);
  }

  function duplicate(entryId: string) {
    const original = nutrition!.entries.find((e) => e.id === entryId);
    if (original) void add([itemFromEntry(original, original.mealType, 'duplicate', original.isEstimated, uuid())]);
  }

  const row = (entry: EntryView) => (
    <EntryItem
      key={entry.id}
      entry={entry}
      target={day.target}
      pending={false}
      badge={pending.has(entry.id) ? <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">sin subir</span> : null}
      onSave={async (quantity, unit) => (quantity === entry.quantity && unit === entry.unit ? true : update(entry.id, { quantity, unit }))}
      onMove={(mealType) => void update(entry.id, { mealType })}
      onDuplicate={() => duplicate(entry.id)}
      onDelete={() => void save(FOOD_DELETE_OP, { entryId: entry.id })}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{t.nutrition.title}</h1>
        <Button variant="ghost" size="sm" className="text-muted-foreground" aria-label={t.nutrition.copyFromDay} onClick={() => setCopying(true)}>
          <CopyPlus className="size-4" />
        </Button>
      </div>

      <DayNavBar dateISO={date} todayISO={todayISO} minISO={nutrition.since} onGo={(iso) => setChosen(iso === todayISO ? null : iso)} />
      {date === nutrition.since ? (
        <p className="text-center text-xs text-muted-foreground">La app guarda los últimos 60 días. Los anteriores están en la web.</p>
      ) : null}
      {error ? <Card className="border-warning text-sm text-warning">{error}</Card> : null}

      {day.target ? (
        <DayTotalsCard t={t} totals={day.totals} target={day.target} />
      ) : (
        <Card className="text-sm text-muted-foreground">
          {t.nutrition.noTarget} · {day.totals.kcal} kcal
        </Card>
      )}

      {MEALS.map((m) => (
        <MealCard
          key={m}
          label={t.nutrition.meals[m]}
          kcal={day.mealTotals[m].kcal}
          emptyText={t.nutrition.emptyMeal}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setAddTo(m)}>
                <Plus className="size-4" />
                {t.nutrition.addFood}
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setSavedTo(m)}>
                <ListPlus className="size-4" />
                {t.nutrition.addFrequent}
              </Button>
            </>
          }
        >
          {day.meals[m].map(row)}
        </MealCard>
      ))}

      {addTo ? <AddFoodSheet t={t} mealType={addTo} nutrition={nutrition} onAdd={add} onClose={() => setAddTo(null)} /> : null}
      {savedTo ? <SavedMealSheet t={t} mealType={savedTo} nutrition={nutrition} onAdd={add} onClose={() => setSavedTo(null)} /> : null}
      {copying ? <CopyDaySheet t={t} toDate={date} todayISO={todayISO} nutrition={nutrition} onAdd={add} onClose={() => setCopying(false)} /> : null}
    </div>
  );
}

function SavedMealSheet({
  t,
  mealType,
  nutrition,
  onAdd,
  onClose,
}: {
  t: Dictionary;
  mealType: Meal;
  nutrition: NutritionData;
  onAdd: (items: AddItem[]) => Promise<boolean>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.nutrition.frequentPickTitle}</DialogTitle>
        </DialogHeader>
        {nutrition.meals.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t.nutrition.frequentEmpty}</p>
        ) : (
          <ul className="max-h-72 divide-y overflow-y-auto">
            {nutrition.meals.map((meal) => (
              <li key={meal.id}>
                <button
                  type="button"
                  disabled={busy || meal.items.length === 0}
                  onClick={async () => {
                    setBusy(true);
                    if (await onAdd(meal.items.map((i) => itemFromEntry(i, mealType, 'meal', false, uuid())))) onClose();
                    else setBusy(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 py-3 text-left disabled:opacity-50"
                >
                  <span className="text-sm font-medium">{meal.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {interpolate(t.nutrition.frequentItems, { n: meal.items.length, kcal: Math.round(meal.items.reduce((s, i) => s + i.kcal, 0)) })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CopyDaySheet({
  t,
  toDate,
  todayISO,
  nutrition,
  onAdd,
  onClose,
}: {
  t: Dictionary;
  toDate: string;
  todayISO: string;
  nutrition: NutritionData;
  onAdd: (items: AddItem[]) => Promise<boolean>;
  onClose: () => void;
}) {
  const [from, setFrom] = useState(() => addDaysISO(toDate, -1));
  const [busy, setBusy] = useState(false);
  const source = nutrition.entries.filter((e) => e.date === from).sort((a, b) => a.position - b.position);
  const usable = from !== toDate && from >= nutrition.since && from <= todayISO;
  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.nutrition.copyTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>{t.nutrition.copyFromLabel}</Label>
          <Input type="date" value={from} min={nutrition.since} max={todayISO} onChange={(e) => setFrom(e.target.value)} />
        </div>
        {usable && source.length === 0 ? <p className="text-sm text-muted-foreground">Ese día no tiene nada anotado.</p> : null}
        <Button
          disabled={busy || !usable || source.length === 0}
          onClick={async () => {
            setBusy(true);
            if (await onAdd(source.map((e) => itemFromEntry(e, e.mealType, 'copy', e.isEstimated, uuid())))) onClose();
            else setBusy(false);
          }}
        >
          {t.common.confirm}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
