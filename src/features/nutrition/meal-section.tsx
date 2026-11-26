'use client';

import { BookmarkPlus, ListPlus, Plus } from 'lucide-react';
import type { MealType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import type { MacroTotals } from '@/lib/nutrition/food-math';
import type { DayEntry, FrequentMeal } from './queries';
import { EntryRow } from './entry-row';
import { MealCard } from './meal-card';
import { AddFoodDialog } from './add-food-dialog';
import { FrequentPickDialog, SaveFrequentDialog } from './frequent-and-copy';

export function MealSection({
  date,
  mealType,
  entries,
  total,
  target,
  frequentMeals,
}: {
  date: string;
  mealType: MealType;
  entries: DayEntry[];
  total: MacroTotals;
  /** Objetivo diario de la persona, para mostrar qué parte del día es cada alimento. */
  target: MacroTotals | null;
  frequentMeals: FrequentMeal[];
}) {
  const t = useT();
  const label = t.nutrition.meals[mealType];

  return (
    <MealCard
      label={label}
      kcal={total.kcal}
      emptyText={t.nutrition.emptyMeal}
      headerAction={
        entries.length > 0 ? (
          <SaveFrequentDialog date={date} mealType={mealType} defaultName={label}>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
              <BookmarkPlus className="size-3.5" />
              {t.nutrition.saveAsFrequent}
            </Button>
          </SaveFrequentDialog>
        ) : null
      }
      footer={
        <>
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
        </>
      }
    >
      {entries.map((e) => (
        <EntryRow key={e.id} entry={e} target={target} />
      ))}
    </MealCard>
  );
}
