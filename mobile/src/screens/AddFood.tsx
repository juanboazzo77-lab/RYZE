import { useMemo, useState } from 'react';
import { Pencil, Search, UtensilsCrossed } from 'lucide-react';
import { DecimalInput } from '@/components/form/decimal-input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FoodResultList, QuantityView } from '@/features/nutrition/food-pick';
import type { Dictionary } from '@/i18n';
import { searchLibrary } from '@/lib/nutrition/food-search';
import { uuid } from '@/lib/sync/engine';
import { itemFromEntry, itemFromFood, itemFromManual, recentFoods, type AddItem, type LibraryFood, type Meal, type Nutrition, type RecentFood } from '@/lib/sync/nutrition';

type Picked = { food: LibraryFood; initial?: { quantity: number; unit: string } } | { recent: RecentFood };

/**
 * Agregar un alimento sin señal: de la biblioteca guardada en el teléfono, de lo anotado hace poco o a mano. El
 * escáner, la foto y "describir" necesitan internet y llegan más adelante.
 */
export function AddFoodSheet({
  t,
  mealType,
  nutrition,
  onAdd,
  onClose,
}: {
  t: Dictionary;
  mealType: Meal;
  nutrition: Nutrition;
  onAdd: (items: AddItem[]) => Promise<boolean>;
  onClose: () => void;
}) {
  const td = t.nutrition.dialog;
  const [picked, setPicked] = useState<Picked | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(item: AddItem) {
    setBusy(true);
    if (await onAdd([item])) onClose();
    else setBusy(false);
  }

  const results = useMemo(() => searchLibrary(nutrition.foods, query), [nutrition.foods, query]);
  const recents = useMemo(() => recentFoods(nutrition.entries), [nutrition.entries]);

  /** Algo anotado antes: si es de la biblioteca se puede cambiar la cantidad; si no, se repite tal cual. */
  function pickRecent(recent: RecentFood) {
    const food = recent.last.foodId ? nutrition.foods.find((f) => f.id === recent.last.foodId) : undefined;
    setPicked(food ? { food, initial: { quantity: recent.last.quantity, unit: recent.last.unit } } : { recent });
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="h-[92dvh] gap-3">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
              <UtensilsCrossed className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 text-left">
              <DialogTitle>{td.title}</DialogTitle>
              <p className="text-sm text-muted-foreground">{t.nutrition.meals[mealType]}</p>
            </div>
          </div>
        </DialogHeader>

        {picked ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {'food' in picked ? (
              <QuantityView
                food={picked.food}
                initial={picked.initial}
                pending={busy}
                onBack={() => setPicked(null)}
                onAdd={(quantity, unit) => void add(itemFromFood(picked.food, mealType, quantity, unit, uuid()))}
              />
            ) : (
              <RepeatView
                t={t}
                recent={picked.recent}
                busy={busy}
                onBack={() => setPicked(null)}
                onAdd={() => void add(itemFromEntry(picked.recent.last, mealType, 'duplicate', picked.recent.last.isEstimated, uuid()))}
              />
            )}
          </div>
        ) : (
          <Tabs defaultValue="search" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="h-14 w-full rounded-xl p-1">
              <TabsTrigger value="search" className="h-full flex-1 flex-col gap-0.5 rounded-lg px-1 py-1 data-[state=active]:text-primary">
                <Search className="size-[18px]" aria-hidden="true" />
                <span className="text-[11px] leading-none">{td.searchTab}</span>
              </TabsTrigger>
              <TabsTrigger value="manual" className="h-full flex-1 flex-col gap-0.5 rounded-lg px-1 py-1 data-[state=active]:text-primary">
                <Pencil className="size-[18px]" aria-hidden="true" />
                <span className="text-[11px] leading-none">{td.manualTab}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="search" className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-2 py-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={td.searchPlaceholder} className="h-12 rounded-xl pl-10 text-base" />
                </div>
                {query.trim().length >= 2 ? (
                  results.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{td.noResults}</p>
                  ) : (
                    <FoodResultList foods={results} per100={td.per100} onPick={(food) => setPicked({ food })} />
                  )
                ) : recents.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">{td.searchHint}</p>
                ) : (
                  <>
                    <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recientes</p>
                    <ul className="divide-y">
                      {recents.map((r) => (
                        <li key={r.key}>
                          <button type="button" onClick={() => pickRecent(r)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{r.last.name}</span>
                              <span className="block truncate text-xs text-muted-foreground tabular-nums">
                                {r.last.quantity} {r.last.unit}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums">{Math.round(r.last.kcal)} kcal</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </TabsContent>
            <TabsContent value="manual" className="min-h-0 flex-1 overflow-y-auto">
              <ManualView t={t} busy={busy} onAdd={(name, macros) => void add(itemFromManual(name, macros, mealType, td.serving, uuid()))} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RepeatView({ t, recent, busy, onBack, onAdd }: { t: Dictionary; recent: RecentFood; busy: boolean; onBack: () => void; onAdd: () => void }) {
  const e = recent.last;
  return (
    <div className="space-y-4 py-2">
      <p className="text-sm font-medium">{e.name}</p>
      <div className="rounded-lg bg-secondary/60 p-3 text-sm">
        <p className="mb-1 text-xs text-muted-foreground tabular-nums">
          {e.quantity} {e.unit}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
          <span className="font-semibold">{Math.round(e.kcal)} kcal</span>
          <span>P {e.proteinG} g</span>
          <span>C {e.carbsG} g</span>
          <span>G {e.fatG} g</span>
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={busy}>
          {t.common.back}
        </Button>
        <Button onClick={onAdd} className="flex-1" disabled={busy}>
          {t.nutrition.dialog.add}
        </Button>
      </div>
    </div>
  );
}

function ManualView({
  t,
  busy,
  onAdd,
}: {
  t: Dictionary;
  busy: boolean;
  onAdd: (name: string, macros: { kcal: number; proteinG: number; carbsG: number; fatG: number }) => void;
}) {
  const td = t.nutrition.dialog;
  const [name, setName] = useState('');
  const [v, setV] = useState({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  const fields = [
    ['kcal', td.manualKcal],
    ['proteinG', td.manualProtein],
    ['carbsG', td.manualCarbs],
    ['fatG', td.manualFat],
  ] as const;
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>{td.manualName}</Label>
        <Input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs">{label}</Label>
            <DecimalInput value={v[key]} onValueChange={(x) => setV((old) => ({ ...old, [key]: Math.min(100000, Math.max(0, x ?? 0)) }))} />
          </div>
        ))}
      </div>
      <Button className="w-full" disabled={busy || name.trim().length < 2} onClick={() => onAdd(name.trim(), v)}>
        {td.add}
      </Button>
    </div>
  );
}
