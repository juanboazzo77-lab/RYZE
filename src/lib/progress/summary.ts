/**
 * Los números de la pantalla de peso, a partir de los registros. Lo usan la web y la app (así sin señal se ve lo mismo,
 * incluso con lo que todavía no se subió). Funciones puras.
 */
import { linearTrend, movingAverage, periodChangeKg, recentAverage, type Trend, type WeightPoint } from './weight';

export interface WeightGoal {
  startWeightKg: number | null;
  targetWeightKg: number | null;
}

export interface WeightSummary {
  chart: Array<{ date: string; weight: number | null; avg: number }>;
  firstKg: number | null;
  currentKg: number | null;
  startKg: number | null; // el del objetivo, o el primer registro
  targetKg: number | null;
  totalChangeKg: number | null;
  stats: {
    weekAvg: number | null;
    weeklyChangeKg: number | null;
    monthlyChangeKg: number | null;
    trend: Trend | null;
  };
}

/** `points` del más viejo al más nuevo. `rangeDays` acota el gráfico y la tendencia. */
export function weightSummary(points: WeightPoint[], goal: WeightGoal | null, todayISO: string, rangeDays: number): WeightSummary {
  const firstKg = points[0]?.weightKg ?? null;
  const currentKg = points[points.length - 1]?.weightKg ?? null;
  const startKg = goal?.startWeightKg ?? firstKg;
  const targetKg = goal?.targetWeightKg ?? null;
  const totalChangeKg = currentKg !== null && startKg !== null ? Math.round((currentKg - startKg) * 10) / 10 : null;

  // Ventana del gráfico
  const cutoffIdx = Math.max(0, points.length && rangeDays < 100000 ? findCutoff(points, todayISO, rangeDays) : 0);
  const inRange = points.slice(cutoffIdx);
  const maByDate = new Map(movingAverage(points, 7).map((m) => [m.date, m.weightKg]));
  const chart = inRange.map((p) => ({ date: p.date, weight: p.weightKg, avg: maByDate.get(p.date) ?? p.weightKg }));

  return {
    chart,
    firstKg,
    currentKg,
    startKg,
    targetKg,
    totalChangeKg,
    stats: {
      weekAvg: recentAverage(points, todayISO, 7),
      weeklyChangeKg: periodChangeKg(points, todayISO, 7),
      monthlyChangeKg: periodChangeKg(points, todayISO, 30),
      trend: linearTrend(inRange.length >= 3 ? inRange : points),
    },
  };
}

function findCutoff(points: WeightPoint[], todayISO: string, rangeDays: number): number {
  const cutoff = new Date(`${todayISO}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - rangeDays);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  const idx = points.findIndex((p) => p.date >= cutoffISO);
  return idx < 0 ? points.length : idx;
}
