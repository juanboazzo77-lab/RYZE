'use client';

import { BookmarkPlus, ListPlus, Plus } from 'lucide-react';
import type { MealType } from '@prisma/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import type { MacroTotals } from '@/lib/nutrition/food-math';
import type { DayEntry, FrequentMeal } from './queries';
import { EntryRow } from './entry-row';
import { AddFoodDialog } from './add-food-dialog';
import { FrequentPickDialog, SaveFrequentDialog } from './frequent-and-copy';

export function MealSection({
  date,
  mealType,
  entries,
  total,
  frequentMeals,
}: {
  date: string;
  mealType: MealType;
  entries: DayEntry[];
  total: MacroTotals;
  frequentMeals: FrequentMeal[];
}) {
  const t = useT();
  const label = t.nutrition.meals[mealType];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
        <div className="flex items-baseline gap-2">
          <h2 className="font-semibold">{label}</h2>
          {total.kcal > 0 ? (
            <span className="text-sm text-muted-foreground tabular-nums">{total.kcal} kcal</span>
          ) : null}
        </div>
        {entries.length > 0 ? (
          <SaveFrequentDialog date={date} mealType={mealType} defaultName={label}>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
              <BookmarkPlus className="size-3.5" />
              {t.nutrition.saveAsFrequent}
            </Button>
          </SaveFrequentDialog>
        ) : null}
      </CardHeader>
      <CardContent className="pt-0">
        {entries.length === 0 ? (
          <p className="py-1 text-sm text-muted-foreground">{t.nutrition.emptyMeal}</p>
        ) : (
          <div className="divide-y">
            {entries.map((e) => (
              <EntryRow key={e.id} entry={e} />
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <AddFoodDialog date={date} mealType={mealType}>
            <Button variant="secondary" size="sm">
              <Plus className="size-4" />
              {t.nutrition.addFood}
            </Button>
          </AddFoodDialog>
          <FrequentPickDialog date={date} mealType={mealType} meals={frequentMeals}>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <ListPlus className="size-4" />
              {t.nutrition.addFrequent}
            </Button>
          </FrequentPickDialog>
        </div>
      </CardContent>
    </Card>
  );
}
