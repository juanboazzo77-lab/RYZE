import 'server-only';
import type { Profile } from '@prisma/client';
import { forUser } from '@/server/user-db';
import { localTodayISO } from '@/lib/date';
import {
  linearTrend,
  movingAverage,
  periodChangeKg,
  recentAverage,
  type Trend,
  type WeightPoint,
} from '@/lib/progress/weight';

export interface WeightEntryDTO {
  id: string;
  date: string; // yyyy-mm-dd
  weightKg: number;
  note: string | null;
}

export interface WeightPageData {
  todayISO: string;
  rangeDays: number;
  entries: WeightEntryDTO[]; // dentro del rango, asc
  chart: Array<{ date: string; weight: number | null; avg: number }>;
  firstKg: number | null;
  currentKg: number | null;
  startKg: number | null; // goal.startWeightKg ?? primer registro
  targetKg: number | null;
  totalChangeKg: number | null;
  stats: {
    weekAvg: number | null;
    weeklyChangeKg: number | null;
    monthlyChangeKg: number | null;
    trend: Trend | null;
  };
}

export async function getWeightPage(profile: Profile, rangeDays: number): Promise<WeightPageData> {
  const db = forUser(profile.id);
  const todayISO = localTodayISO(profile.timezone);

  const [all, goal] = await db.$transaction([
    db.weightEntry.findMany({
      orderBy: { date: 'asc' },
      select: { id: true, date: true, weightKg: true, note: true },
    }),
    db.goal.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { startWeightKg: true, targetWeightKg: true },
    }),
  ]);

  const points: WeightPoint[] = all.map((e) => ({
    date: e.date.toISOString().slice(0, 10),
    weightKg: e.weightKg,
  }));

  const firstKg = points[0]?.weightKg ?? null;
  const currentKg = points[points.length - 1]?.weightKg ?? null;
  const startKg = goal?.startWeightKg ?? firstKg;
  const targetKg = goal?.targetWeightKg ?? null;
  const totalChangeKg =
    currentKg !== null && startKg !== null ? Math.round((currentKg - startKg) * 10) / 10 : null;

  // Ventana del gráfico
  const cutoffIdx = Math.max(0, points.length && rangeDays < 100000 ? findCutoff(points, todayISO, rangeDays) : 0);
  const inRange = points.slice(cutoffIdx);
  const maAll = movingAverage(points, 7);
  const maByDate = new Map(maAll.map((m) => [m.date, m.weightKg]));
  const chart = inRange.map((p) => ({
    date: p.date,
    weight: p.weightKg,
    avg: maByDate.get(p.date) ?? p.weightKg,
  }));

  const entries: WeightEntryDTO[] = all
    .slice(cutoffIdx)
    .map((e) => ({
      id: e.id,
      date: e.date.toISOString().slice(0, 10),
      weightKg: e.weightKg,
      note: e.note,
    }))
    .reverse();

  return {
    todayISO,
    rangeDays,
    entries,
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
