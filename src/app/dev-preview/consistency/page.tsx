import { notFound } from 'next/navigation';
import { getT } from '@/i18n/server';
import { addDaysISO } from '@/lib/date';
import { buildYearGrid, longestStreak, yearsToShow } from '@/features/consistency/grid';
import { ConsistencyScreen } from '@/features/consistency/screen';
import { workoutStreak } from '@/features/dashboard/compute';

/**
 * Cómo se ve la pantalla de constancia, con entrenamientos de ejemplo: SÓLO en desarrollo (sirve para revisar la
 * pantalla sin una cuenta real). En producción no existe (404). `?vacio=1` muestra la pantalla sin entrenamientos.
 */

// Un número "al azar" siempre igual, para que la vista de ejemplo no cambie entre recargas.
function pseudo(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export default async function DevConsistencyPreview({ searchParams }: { searchParams: Promise<{ vacio?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const sp = await searchParams;
  const { t, locale } = await getT();

  const todayISO = '2026-11-24';
  const trained = new Set<string>();
  if (!sp.vacio) {
    // Desde el 10/03/2024: varios entrenos por semana, con algunos descansos, y racha activa hasta hoy.
    for (let d = '2024-03-10', i = 0; d <= todayISO; d = addDaysISO(d, 1), i++) {
      const density = d < '2025-01-01' ? 0.45 : d < '2026-01-01' ? 0.75 : 0.9;
      if (pseudo(i) < density) trained.add(d);
    }
    for (let k = 0; k < 40; k++) trained.add(addDaysISO(todayISO, -k));
  }

  const years = yearsToShow(trained, todayISO).map((y) => {
    const g = buildYearGrid(y, trained, todayISO, 1);
    return { ...g, cells: g.cells.map(({ col, row, state }) => ({ col, row, state })) };
  });
  const view = {
    todayISO,
    streak: workoutStreak(trained, todayISO, addDaysISO),
    longest: longestStreak(trained),
    totalDays: trained.size,
    years,
  };

  return (
    <div className="min-h-screen bg-background px-4 pt-6 text-foreground" style={{ width: 390 }}>
      <style>{'nextjs-portal { display: none !important; }'}</style>
      <ConsistencyScreen t={t} locale={locale} view={view} firstName="Juan" />
    </div>
  );
}
