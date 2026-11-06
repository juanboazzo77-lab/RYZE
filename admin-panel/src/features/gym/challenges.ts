/**
 * Retos del gimnasio: un desafío entre los socios con Forza AI (por ejemplo "quién entrena más este mes"). El
 * puntaje sale solo de los entrenamientos que cada socio completa en la app. Hay una copia de este archivo en
 * admin-panel/src/features/gym/challenges.ts (el panel es un sitio aparte): si cambia uno, cambiar el otro.
 */

export type ChallengeMetric = 'WORKOUTS' | 'DAYS';

export const CHALLENGE_METRICS: Array<{ key: ChallengeMetric; label: string; unit: string; unitOne: string; help: string }> = [
  { key: 'WORKOUTS', label: 'Entrenamientos completados', unit: 'entrenamientos', unitOne: 'entrenamiento', help: 'Cuenta cada entrenamiento que el socio termina.' },
  { key: 'DAYS', label: 'Días entrenados', unit: 'días', unitOne: 'día', help: 'Cuenta los días distintos en que entrenó (dos entrenamientos el mismo día cuentan uno).' },
];

export const asMetric = (v: string): ChallengeMetric => (v === 'DAYS' ? 'DAYS' : 'WORKOUTS');
export const metricInfo = (m: string) => CHALLENGE_METRICS.find((x) => x.key === m) ?? CHALLENGE_METRICS[0]!;

export const MAX_OPEN_CHALLENGES = 10;
export const MAX_CHALLENGE_DAYS = 120;
export const GYM_TZ = 'America/Argentina/Buenos_Aires';

const MS_DAY = 24 * 60 * 60 * 1000;
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
export const isISODate = (v: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(toMs(v));
export const daysBetween = (a: string, b: string): number => Math.round((toMs(b) - toMs(a)) / MS_DAY);

export type ChallengeStatus = 'UPCOMING' | 'ACTIVE' | 'ENDED';

export function challengeStatus(startsOn: string, endsOn: string, today: string): ChallengeStatus {
  if (today < startsOn) return 'UPCOMING';
  if (today > endsOn) return 'ENDED';
  return 'ACTIVE';
}

/** Días que faltan para que termine (0 = hoy es el último día). Nunca negativo. */
export const daysLeft = (endsOn: string, today: string): number => Math.max(0, daysBetween(today, endsOn));

/** "Ana Pérez" → "Ana P." (en el ranking nadie muestra su nombre completo). */
export function displayName(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Socio';
  const first = parts[0]!.slice(0, 20);
  const last = parts[1]?.charAt(0).toUpperCase();
  return last ? `${first} ${last}.` : first;
}

/** Fecha local (yyyy-mm-dd) de un instante. */
export function localDay(d: Date, tz = GYM_TZ): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** El puntaje de un socio: sus entrenamientos terminados dentro de las fechas del reto. */
export function scoreOf(metric: ChallengeMetric, finishedAts: Date[], startsOn: string, endsOn: string, tz = GYM_TZ): number {
  const days = finishedAts.map((d) => localDay(d, tz)).filter((day) => day >= startsOn && day <= endsOn);
  return metric === 'DAYS' ? new Set(days).size : days.length;
}

export interface RankInput {
  userId: string;
  name: string;
  score: number;
}
export interface Ranked extends RankInput {
  /** Puesto; los empates comparten puesto (1, 2, 2, 4). */
  position: number;
}

/** Ordena de mayor a menor puntaje; a igual puntaje, por nombre. */
export function rankEntries(rows: RankInput[]): Ranked[] {
  const sorted = [...rows].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'es'));
  return sorted.map((r, i) => ({ ...r, position: i > 0 && sorted[i - 1]!.score === r.score ? 0 : i + 1 })).map((r, i, all) => {
    if (r.position !== 0) return r;
    let k = i;
    while (k > 0 && all[k]!.position === 0) k -= 1;
    return { ...r, position: all[k]!.position };
  });
}

const clip = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export interface ChallengeInput {
  title: string;
  description: string;
  metric: ChallengeMetric;
  startsOn: string;
  endsOn: string;
  prize: string;
}

/** Valida lo que carga el dueño: título, fechas coherentes y duración razonable. */
export function cleanChallenge(input: { title?: unknown; description?: unknown; metric?: unknown; startsOn?: unknown; endsOn?: unknown; prize?: unknown }): ChallengeInput | { error: 'TITLE' | 'DATES' | 'TOO_LONG' } {
  const title = clip(input.title, 80);
  if (title.length < 2) return { error: 'TITLE' };
  const startsOn = typeof input.startsOn === 'string' ? input.startsOn : '';
  const endsOn = typeof input.endsOn === 'string' ? input.endsOn : '';
  if (!isISODate(startsOn) || !isISODate(endsOn) || endsOn < startsOn) return { error: 'DATES' };
  if (daysBetween(startsOn, endsOn) + 1 > MAX_CHALLENGE_DAYS) return { error: 'TOO_LONG' };
  return { title, description: clip(input.description, 400), metric: asMetric(String(input.metric ?? '')), startsOn, endsOn, prize: clip(input.prize, 120) };
}

/** Arma el ranking de un reto: a cada socio que se sumó le cuenta sus entrenamientos terminados dentro de las fechas. */
export function buildRanking(args: {
  metric: ChallengeMetric;
  startsOn: string;
  endsOn: string;
  entrants: Array<{ userId: string; name: string | null }>;
  workouts: Array<{ userId: string; finishedAt: Date }>;
}): Ranked[] {
  const byUser = new Map<string, Date[]>();
  for (const w of args.workouts) {
    const list = byUser.get(w.userId);
    if (list) list.push(w.finishedAt);
    else byUser.set(w.userId, [w.finishedAt]);
  }
  return rankEntries(
    args.entrants.map((e) => ({ userId: e.userId, name: displayName(e.name), score: scoreOf(args.metric, byUser.get(e.userId) ?? [], args.startsOn, args.endsOn) })),
  );
}
