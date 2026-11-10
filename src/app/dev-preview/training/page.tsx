import { notFound } from 'next/navigation';
import { getT } from '@/i18n/server';
import { WeekView } from '@/features/training/week-view';
import { NewPlanButton } from '@/features/training/new-plan-button';
import { AddFoodDialog } from '@/features/nutrition/add-food-dialog';
import { Button } from '@/components/ui/button';

/** Vista de la semana de entrenamiento y del cuadro de agregar alimento con datos de ejemplo, SÓLO en desarrollo. En producción no existe (404). */
export default async function DevTrainingPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  const { t } = await getT();
  const days = [
    { id: 'a', name: 'Lunes - Empuje (pecho, hombro y tríceps)', weekday: 1, exerciseCount: 8 },
    { id: 'b', name: 'Martes - Pierna pesada', weekday: 2, exerciseCount: 8 },
    { id: 'c', name: 'Miércoles - Tirón (espalda y bíceps)', weekday: 3, exerciseCount: 8 },
    { id: 'd', name: 'Jueves - Fútbol específico', weekday: 4, exerciseCount: 7 },
    { id: 'e', name: 'Viernes - Torso (pecho y espalda)', weekday: 5, exerciseCount: 8 },
  ];
  return (
    <div className="mx-auto max-w-md space-y-5 px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{t.training.title}</h1>
      <div className="flex gap-2">
        <NewPlanButton />
        <AddFoodDialog date="2026-11-10" mealType="BREAKFAST">
          <Button variant="outline" size="sm" className="rounded-full">
            {t.nutrition.addFood}
          </Button>
        </AddFoodDialog>
      </div>
      <WeekView plan={{ id: 'p', name: 'Híbrido Fútbol + Estética Juanse', days }} t={t} todayWeekday={3} showHero />
    </div>
  );
}
