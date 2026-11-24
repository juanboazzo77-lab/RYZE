import { notFound } from 'next/navigation';
import { MealSection } from '@/features/nutrition/meal-section';
import type { DayEntry } from '@/features/nutrition/queries';

/**
 * Cómo se ve la lista de comidas y el panel de detalle de un alimento, con datos de ejemplo: SÓLO en desarrollo
 * (sirve para revisar la pantalla sin una cuenta real). En producción no existe (404).
 */

const ENTRIES: DayEntry[] = [
  {
    id: 'e1', mealType: 'LUNCH', foodId: 'f1', name: 'Pechuga de pollo a la plancha', quantity: 180, unit: 'g',
    kcal: 297, proteinG: 55.8, carbsG: 0, fatG: 6.5, isEstimated: false, position: 0, brand: null,
    per100: { kcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
  },
  {
    id: 'e2', mealType: 'LUNCH', foodId: 'f2', name: 'Arroz integral cocido', quantity: 150, unit: 'g',
    kcal: 167, proteinG: 3.9, carbsG: 34.5, fatG: 1.4, isEstimated: false, position: 1, brand: 'Marolio',
    per100: { kcal: 111, proteinG: 2.6, carbsG: 23, fatG: 0.9 },
  },
  {
    id: 'e3', mealType: 'LUNCH', foodId: null, name: 'Ensalada mixta con aceite de oliva', quantity: 1, unit: 'porción',
    kcal: 180, proteinG: 2, carbsG: 9, fatG: 15, isEstimated: true, position: 2, brand: null, per100: null,
  },
];

const TOTAL = { kcal: 644, proteinG: 61.7, carbsG: 43.5, fatG: 22.9 };
const TARGET = { kcal: 2200, proteinG: 150, carbsG: 250, fatG: 70 };

export default function DevNutritionPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <div className="min-h-screen bg-background px-4 pt-6 text-foreground" style={{ width: 390 }}>
      <style>{'nextjs-portal { display: none !important; }'}</style>
      <h1 className="pb-3 text-2xl font-bold tracking-tight">Nutrición</h1>
      <MealSection date="2026-11-24" mealType="LUNCH" entries={ENTRIES} total={TOTAL} target={TARGET} frequentMeals={[]} />
    </div>
  );
}
