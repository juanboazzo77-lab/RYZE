import 'server-only';
import { prisma } from './db';
import { localTodayISO } from '@/lib/date';
import {
  asMetric,
  buildRanking,
  challengeStatus,
  daysLeft,
  GYM_TZ,
  type ChallengeMetric,
  type ChallengeStatus,
  type Ranked,
} from '@/features/gym/challenges';

/**
 * Retos del gimnasio, vistos por sus socios. Todo sale del gimnasio ACTIVO de quien mira (el `gymId` viene de su
 * membresía, nunca de la dirección). En el ranking solo aparecen los socios que se sumaron al reto, con su nombre
 * y la inicial del apellido.
 */

const isoOf = (d: Date) => d.toISOString().slice(0, 10);
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ChallengeView {
  id: string;
  title: string;
  description: string;
  metric: ChallengeMetric;
  startsOn: string;
  endsOn: string;
  prize: string | null;
  status: ChallengeStatus;
  daysLeft: number;
  joined: boolean;
  entrants: number;
  /** Los 10 primeros. */
  top: Ranked[];
  /** Mi puesto (si me sumé), aunque no esté entre los 10 primeros. */
  me: Ranked | null;
}

async function rankingFor(challenge: { metric: string; startsOn: Date; endsOn: Date }, entries: Array<{ userId: string; user: { name: string | null } }>): Promise<Ranked[]> {
  if (entries.length === 0) return [];
  const start = isoOf(challenge.startsOn);
  const end = isoOf(challenge.endsOn);
  const workouts = await prisma.workout.findMany({
    where: {
      userId: { in: entries.map((e) => e.userId) },
      status: 'COMPLETED',
      // Margen de un día a cada lado: el recorte exacto por día de Argentina se hace después.
      finishedAt: { gte: new Date(challenge.startsOn.getTime() - DAY_MS), lte: new Date(challenge.endsOn.getTime() + 2 * DAY_MS) },
    },
    select: { userId: true, finishedAt: true },
    take: 20_000,
  });
  return buildRanking({
    metric: asMetric(challenge.metric),
    startsOn: start,
    endsOn: end,
    entrants: entries.map((e) => ({ userId: e.userId, name: e.user.name })),
    workouts: workouts.flatMap((w) => (w.finishedAt ? [{ userId: w.userId, finishedAt: w.finishedAt }] : [])),
  });
}

/** Los retos del gimnasio del socio: los que vienen, los activos y los que terminaron hace poco. */
export async function listChallengesForMember(userId: string, gymId: string, today = localTodayISO(GYM_TZ)): Promise<ChallengeView[]> {
  const since = new Date(Date.parse(`${today}T00:00:00Z`) - 30 * DAY_MS);
  const rows = await prisma.gymChallenge.findMany({
    where: { gymId, endsOn: { gte: since } },
    orderBy: { startsOn: 'asc' },
    take: 10,
    include: { entries: { select: { userId: true, user: { select: { name: true } } } } },
  });
  const out: ChallengeView[] = [];
  for (const c of rows) {
    const startsOn = isoOf(c.startsOn);
    const endsOn = isoOf(c.endsOn);
    const ranking = await rankingFor(c, c.entries);
    out.push({
      id: c.id,
      title: c.title,
      description: c.description ?? '',
      metric: asMetric(c.metric),
      startsOn,
      endsOn,
      prize: c.prize,
      status: challengeStatus(startsOn, endsOn, today),
      daysLeft: daysLeft(endsOn, today),
      joined: c.entries.some((e) => e.userId === userId),
      entrants: c.entries.length,
      top: ranking.slice(0, 10),
      me: ranking.find((r) => r.userId === userId) ?? null,
    });
  }
  // Primero lo que está pasando, después lo que viene y al final lo que terminó.
  const order = { ACTIVE: 0, UPCOMING: 1, ENDED: 2 } as const;
  return out.sort((a, b) => order[a.status] - order[b.status]);
}

/** El reto activo (o el próximo) para mostrar en el inicio, sin armar el ranking completo. */
export async function nextChallengeBanner(userId: string, gymId: string, today = localTodayISO(GYM_TZ)): Promise<{ title: string; status: ChallengeStatus; daysLeft: number; joined: boolean } | null> {
  const c = await prisma.gymChallenge.findFirst({
    where: { gymId, endsOn: { gte: new Date(`${today}T00:00:00.000Z`) } },
    orderBy: { startsOn: 'asc' },
    select: { id: true, title: true, startsOn: true, endsOn: true, entries: { where: { userId }, select: { id: true } } },
  });
  if (!c) return null;
  const startsOn = isoOf(c.startsOn);
  const endsOn = isoOf(c.endsOn);
  const status = challengeStatus(startsOn, endsOn, today);
  return { title: c.title, status, daysLeft: status === 'UPCOMING' ? Math.max(0, Math.round((Date.parse(`${startsOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS)) : daysLeft(endsOn, today), joined: c.entries.length > 0 };
}

/** El socio se suma a un reto de SU gimnasio que no terminó. Sumarse es aceptar aparecer en el ranking. */
export async function joinChallenge(userId: string, gymId: string, challengeId: string, today = localTodayISO(GYM_TZ)): Promise<'ok' | 'NOT_FOUND' | 'ENDED'> {
  const c = await prisma.gymChallenge.findFirst({ where: { id: challengeId, gymId }, select: { id: true, endsOn: true } });
  if (!c) return 'NOT_FOUND';
  if (isoOf(c.endsOn) < today) return 'ENDED';
  await prisma.gymChallengeEntry.upsert({ where: { challengeId_userId: { challengeId: c.id, userId } }, update: {}, create: { challengeId: c.id, userId } });
  return 'ok';
}

/** El socio se baja del reto: deja de aparecer en el ranking. */
export async function leaveChallenge(userId: string, gymId: string, challengeId: string): Promise<boolean> {
  const res = await prisma.gymChallengeEntry.deleteMany({ where: { challengeId, userId, challenge: { gymId } } });
  return res.count > 0;
}
