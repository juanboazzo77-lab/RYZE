import { useMemo, useState } from 'react';
import { Search, UtensilsCrossed, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { DescribeTab, PhotoTab, ScanTab, type EstimateItem } from '@/features/nutrition/ai-tabs';
import { FoodResultList, QuantityView } from '@/features/nutrition/food-pick';
import { FoodTabsList, FULL_SCREEN_CLOSE, FULL_SCREEN_DIALOG, isFullScreenTab } from '@/features/nutrition/food-tabs-list';
import { ManualTab } from '@/features/nutrition/manual-tab';
import type { CreateFoodInput } from '@/features/nutrition/schema';
import type { Dictionary } from '@/i18n';
import { searchLibrary } from '@/lib/nutrition/food-search';
import { uuid } from '@/lib/sync/engine';
import { itemFromEntry, itemFromEstimate, itemFromFood, itemFromManual, recentFoods, type AddItem, type LibraryFood, type Meal, type Nutrition, type RecentFood } from '@/lib/sync/nutrition';
import { cn } from '@/lib/utils';
import type { FoodSearchResult } from '@/server/nutrition/food-provider';
import { createFood, estimatePhoto, estimateText, lookupBarcode, onlineErrorText } from '../online/nutrition';
import { useOnline } from '../platform/use-online';
import { useText } from '../strings';

type Picked = { food: LibraryFood; initial?: { quantity: number; unit: string } } | { recent: RecentFood };

/** Un producto que llegó del servidor, con la forma de la biblioteca del teléfono. */
const asLibraryFood = (food: FoodSearchResult & { id: string }): LibraryFood => ({
  id: food.id,
  name: food.name,
  brand: food.brand,
  kcalPer100: food.kcalPer100,
  proteinPer100: food.proteinPer100,
  carbsPer100: food.carbsPer100,
  fatPer100: food.fatPer100,
  servingQty: food.servingQty,
  servingLabel: food.servingLabel,
  verified: food.verified,
});

/**
 * Agregar un alimento. Sin señal se puede: de la biblioteca guardada en el teléfono, de lo anotado hace poco o a mano.
 * El escáner, la foto y "describir" necesitan internet. En todos los casos lo anotado se guarda primero en el teléfono.
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
  const s = useText();
  const [picked, setPicked] = useState<Picked | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('search');
  const [prefill, setPrefill] = useState<{ name?: string; barcode?: string }>({});
  const online = useOnline();
  const full = !picked && isFullScreenTab(tab);

  async function save(items: AddItem[]): Promise<boolean> {
    setBusy(true);
    const ok = await onAdd(items);
    if (ok) {
      toast.success(t.nutrition.toast.added);
      onClose();
    } else {
      toast.error(s.saveFailed);
      setBusy(false);
    }
    return ok;
  }
  const add = (item: AddItem) => save([item]);
  const addEstimate = (items: EstimateItem[]) => save(items.map((item) => itemFromEstimate(item, mealType, uuid())));
  const errorText = (code: string | undefined) => onlineErrorText(s, code);

  async function addNewFood(input: CreateFoodInput, quantity: number) {
    const created = await createFood(input);
    if ('error' in created) {
      toast.error(created.error === 'offline' ? s.newFoodNeedsInternet : (errorText(created.error) ?? t.nutrition.toast.genericError));
      return;
    }
    const food: LibraryFood = {
      id: created.id,
      name: input.name,
      brand: null,
      kcalPer100: input.kcalPer100,
      proteinPer100: input.proteinPer100,
      carbsPer100: input.carbsPer100,
      fatPer100: input.fatPer100,
      servingQty: null,
      servingLabel: null,
      verified: false,
    };
    await add(itemFromFood(food, mealType, quantity, 'g', uuid()));
  }

  const needsInternet = !online ? (
    <p className="flex shrink-0 items-start gap-2 rounded-xl border bg-card p-3 text-sm">
      <WifiOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span>{s.foodNeedsInternet}</span>
    </p>
  ) : null;

  const results = useMemo(() => searchLibrary(nutrition.foods, query), [nutrition.foods, query]);
  const recents = useMemo(() => recentFoods(nutrition.entries), [nutrition.entries]);

  /** Algo anotado antes: si es de la biblioteca se puede cambiar la cantidad; si no, se repite tal cual. */
  function pickRecent(recent: RecentFood) {
    const food = recent.last.foodId ? nutrition.foods.find((f) => f.id === recent.last.foodId) : undefined;
    setPicked(food ? { food, initial: { quantity: recent.last.quantity, unit: recent.last.unit } } : { recent });
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn('h-[92dvh] gap-3', full && FULL_SCREEN_DIALOG)}
        closeClassName={full ? FULL_SCREEN_CLOSE : undefined}
      >
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
          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
            <FoodTabsList />
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
                    <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.recents}</p>
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
            <TabsContent value="scan" className="min-h-0 flex-1 flex-col gap-3 overflow-y-auto data-[state=active]:flex">
              {needsInternet}
              <div className="min-h-0 flex-1">
                <ScanTab
                  lookup={lookupBarcode}
                  onGoManual={(name, barcode) => {
                    setPrefill({ name, barcode });
                    setTab('manual');
                  }}
                  renderFood={(food, onBack) =>
                    food.id ? (
                      <QuantityView
                        food={food}
                        pending={busy}
                        onBack={onBack}
                        onAdd={(quantity, unit) => void add(itemFromFood(asLibraryFood({ ...food, id: food.id! }), mealType, quantity, unit, uuid()))}
                      />
                    ) : null
                  }
                />
              </div>
            </TabsContent>
            <TabsContent value="photo" className="min-h-0 flex-1 flex-col gap-3 overflow-y-auto data-[state=active]:flex">
              {needsInternet}
              <div className="min-h-0 flex-1">
                <PhotoTab estimatePhoto={estimatePhoto} onAdd={addEstimate} errorText={errorText} />
              </div>
            </TabsContent>
            <TabsContent value="describe" className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {needsInternet}
              <DescribeTab estimateText={estimateText} onAdd={addEstimate} errorText={errorText} />
            </TabsContent>
            <TabsContent value="manual" className="min-h-0 flex-1 overflow-y-auto">
              <ManualTab
                initialName={prefill.name}
                barcode={prefill.barcode}
                onAddTotals={async (name, macros) => {
                  await add(itemFromManual(name, macros, mealType, td.serving, uuid()));
                }}
                onCreateAndAdd={addNewFood}
              />
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

