/**
 * Análisis de la evolución del peso. Funciones puras y testeadas.
 * El peso fluctúa día a día, así que casi todo se calcula sobre medias móviles.
 */
import { DateTime } from 'luxon';

export interface WeightPoint {
  /** yyyy-mm-dd */
  date: string;
  weightKg: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

const dayIndex = (iso: string) => Math.floor(DateTime.fromISO(iso, { zone: 'utc' }).toMillis() / 86400000);

/**
 * Media móvil: para cada punto, promedio de los pesos en la ventana de
 * `windowDays` días calendario que termina en ese punto.
 */
export function movingAverage(points: WeightPoint[], windowDays = 7): WeightPoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((p) => {
    const from = dayIndex(p.date) - (windowDays - 1);
    const win = sorted.filter((q) => dayIndex(q.date) >= from && dayIndex(q.date) <= dayIndex(p.date));
    const avg = win.reduce((s, q) => s + q.weightKg, 0) / win.length;
    return { date: p.date, weightKg: round2(avg) };
  });
}

function avgInWindow(points: WeightPoint[], centerISO: string, windowDays: number): number | null {
  const to = dayIndex(centerISO);
  const from = to - (windowDays - 1);
  const win = points.filter((p) => dayIndex(p.date) >= from && dayIndex(p.date) <= to);
  if (win.length === 0) return null;
  return win.reduce((s, p) => s + p.weightKg, 0) / win.length;
}

/**
 * Cambio en `spanDays` días comparando la media móvil de 7d de ahora contra la
 * de hace `spanDays`. `null` si falta data en alguna ventana.
 */
export function periodChangeKg(
  points: WeightPoint[],
  todayISO: string,
  spanDays: number,
): number | null {
  const past = DateTime.fromISO(todayISO, { zone: 'utc' }).minus({ days: spanDays }).toISODate()!;
  const now = avgInWindow(points, todayISO, 7);
  const then = avgInWindow(points, past, 7);
  if (now === null || then === null) return null;
  return round2(now - then);
}

/** Media de los últimos `days` días. */
export function recentAverage(points: WeightPoint[], todayISO: string, days = 7): number | null {
  const a = avgInWindow(points, todayISO, days);
  return a === null ? null : round1(a);
}

export type TrendDirection = 'down' | 'up' | 'flat';

export interface Trend {
  kgPerWeek: number;
  direction: TrendDirection;
}

/** Regresión lineal por mínimos cuadrados sobre (día, peso) → kg/semana. */
export function linearTrend(points: WeightPoint[]): Trend | null {
  if (points.length < 3) return null;
  const xs = points.map((p) => dayIndex(p.date));
  const x0 = xs[0]!;
  const X = xs.map((x) => x - x0);
  const Y = points.map((p) => p.weightKg);
  const n = X.length;
  const sx = X.reduce((a, b) => a + b, 0);
  const sy = Y.reduce((a, b) => a + b, 0);
  const sxx = X.reduce((a, b) => a + b * b, 0);
  const sxy = X.reduce((a, b, i) => a + b * Y[i]!, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slopePerDay = (n * sxy - sx * sy) / denom;
  const kgPerWeek = round2(slopePerDay * 7);
  const direction: TrendDirection =
    Math.abs(kgPerWeek) < 0.05 ? 'flat' : kgPerWeek < 0 ? 'down' : 'up';
  return { kgPerWeek, direction };
}

export function rangeToDays(range: string | undefined): number {
  switch (range) {
    case '7':
      return 7;
    case '30':
      return 30;
    case '90':
      return 90;
    case '180':
      return 180;
    case '365':
      return 365;
    default:
      return 100000; // "todo"
  }
}
