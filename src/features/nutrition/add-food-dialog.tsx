'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, Search, UtensilsCrossed } from 'lucide-react';
import type { MealType } from '@prisma/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { FoodSearchResult } from '@/server/nutrition/food-provider';
import {
  addFoodEntry,
  addPhotoMealEntries,
  createCustomFood,
  estimateMealPhotoAction,
  estimateMealTextAction,
  lookupBarcodeAction,
  searchFoodAction,
} from './actions';
import { DescribeTab, PhotoTab, ScanTab, type EstimateItem } from './ai-tabs';
import { FoodResultList, QuantityView } from './food-pick';
import { FoodTabsList, FULL_SCREEN_CLOSE, FULL_SCREEN_DIALOG, isFullScreenTab } from './food-tabs-list';
import { ManualTab } from './manual-tab';

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
  const [tab, setTab] = useState('search');
  const full = isFullScreenTab(tab);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setTab('search');
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        // El teclado no se abre solo: aparece cuando la persona toca para escribir.
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn('gap-3', full && FULL_SCREEN_DIALOG)}
        closeClassName={full ? FULL_SCREEN_CLOSE : undefined}
      >
        <Body date={date} mealType={mealType} tab={tab} setTab={setTab} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function Body({
  date,
  mealType,
  tab,
  setTab,
  onDone,
}: {
  date: string;
  mealType: MealType;
  tab: string;
  setTab: (tab: string) => void;
  onDone: () => void;
}) {
  const t = useT();
  const td = t.nutrition.dialog;
  const [prefillName, setPrefillName] = useState('');
  const [prefillBarcode, setPrefillBarcode] = useState<string | undefined>(undefined);

  function goManual(name?: string, barcode?: string) {
    if (name) setPrefillName(name);
    setPrefillBarcode(barcode);
    setTab('manual');
  }

  async function addEstimate(items: EstimateItem[]) {
    const res = await addPhotoMealEntries({ date, mealType, items });
    if (res.ok) {
      toast.success(t.nutrition.toast.added);
      onDone();
    } else toast.error(t.nutrition.toast.genericError);
    return Boolean(res.ok);
  }

  return (
    <>
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
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <FoodTabsList />
        <TabsContent value="search" className="min-h-0 flex-1 overflow-y-auto">
          <SearchTab date={date} mealType={mealType} onDone={onDone} />
        </TabsContent>
        <TabsContent value="scan" className="min-h-0 flex-1 overflow-y-auto">
          <ScanTab
            lookup={lookupBarcodeAction}
            onGoManual={goManual}
            renderFood={(food, onBack) => (
              <QuantityStep food={food} date={date} mealType={mealType} onBack={onBack} onDone={onDone} />
            )}
          />
        </TabsContent>
        <TabsContent value="photo" className="min-h-0 flex-1 overflow-y-auto">
          <PhotoTab estimatePhoto={estimateMealPhotoAction} onAdd={addEstimate} />
        </TabsContent>
        <TabsContent value="describe" className="min-h-0 flex-1 overflow-y-auto">
          <DescribeTab estimateText={estimateMealTextAction} onAdd={addEstimate} />
        </TabsContent>
        <TabsContent value="manual" className="min-h-0 flex-1 overflow-y-auto">
          <WebManualTab
            date={date}
            mealType={mealType}
            onDone={onDone}
            initialName={prefillName}
            barcode={prefillBarcode}
          />
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
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={td.searchPlaceholder}
          className="h-12 rounded-xl pl-10 text-base"
        />
      </div>
      {searching ? (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : q.trim().length < 2 ? (
        <div className="flex flex-col items-center gap-3 px-2 py-5 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-accent text-primary">
            <UtensilsCrossed className="size-7" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold">{td.searchEmptyTitle}</p>
            <p className="text-sm text-muted-foreground">{td.searchHint}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {td.searchSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQ(s)}
                className="rounded-full border bg-card px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-accent active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : results.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{td.noResults}</p>
      ) : (
        <FoodResultList foods={results} per100={td.per100} onPick={setPicked} />
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
  const [pending, start] = useTransition();

  function submit(quantity: number, unit: string) {
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

  return <QuantityView food={food} pending={pending} onBack={onBack} onAdd={submit} />;
}

/* ---------------- Manual ---------------- */
function WebManualTab({
  date,
  mealType,
  onDone,
  initialName,
  barcode,
}: {
  date: string;
  mealType: MealType;
  onDone: () => void;
  initialName?: string;
  barcode?: string;
}) {
  const t = useT();

  function finish(ok: boolean | undefined) {
    if (ok) {
      toast.success(t.nutrition.toast.added);
      onDone();
    } else toast.error(t.nutrition.toast.genericError);
  }

  return (
    <ManualTab
      initialName={initialName}
      barcode={barcode}
      onAddTotals={async (name, macros) => {
        const res = await addFoodEntry({
          date,
          mealType,
          customName: name,
          quantity: 1,
          unit: t.nutrition.dialog.serving,
          manualMacros: macros,
        });
        finish(res.ok);
      }}
      onCreateAndAdd={async (food, quantity) => {
        const created = await createCustomFood(food);
        if (!created.ok || !created.data) {
          toast.error(t.nutrition.toast.genericError);
          return;
        }
        const res = await addFoodEntry({ date, mealType, foodId: created.data.id, quantity, unit: 'g' });
        finish(res.ok);
      }}
    />
  );
}
