import 'server-only';
import { prisma } from './db';
import { todayArgentina } from './gym-fees';
import {
  asMetric,
  buildRanking,
  challengeStatus,
  cleanChallenge,
  daysLeft,
  MAX_OPEN_CHALLENGES,
  type ChallengeMetric,
  type ChallengeStatus,
  type Ranked,
} from '@/features/gym/challenges';

/** Retos del gimnasio, del lado del dueño: crearlos, ver quién va ganando y borrarlos. Cada función comprueba que la cuenta sea la dueña. */

const isoOf = (d: Date) => d.toISOString().slice(0, 10);
const DAY_MS = 24 * 60 * 60 * 1000;

export interface OwnerChallenge {
  id: string;
  title: string;
  description: string;
  metric: ChallengeMetric;
  startsOn: string;
  endsOn: string;
  prize: string | null;
  status: ChallengeStatus;
  daysLeft: number;
  entrants: number;
  /** Los 10 primeros. */
  top: Ranked[];
}

export async function listOwnerChallenges(ownerUserId: string, gymId: string, today = todayArgentina()): Promise<OwnerChallenge[] | null> {
  const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerUserId }, select: { id: true } });
  if (!gym) return null;
  const rows = await prisma.gymChallenge.findMany({
    where: { gymId },
    orderBy: { startsOn: 'desc' },
    take: 20,
    include: { entries: { select: { userId: true, user: { select: { name: true } } } } },
  });
  const out: OwnerChallenge[] = [];
  for (const c of rows) {
    const startsOn = isoOf(c.startsOn);
    const endsOn = isoOf(c.endsOn);
    const workouts =
      c.entries.length === 0
        ? []
        : await prisma.workout.findMany({
            where: {
              userId: { in: c.entries.map((e) => e.userId) },
              status: 'COMPLETED',
              finishedAt: { gte: new Date(c.startsOn.getTime() - DAY_MS), lte: new Date(c.endsOn.getTime() + 2 * DAY_MS) },
            },
            select: { userId: true, finishedAt: true },
            take: 20_000,
          });
    const ranking = buildRanking({
      metric: asMetric(c.metric),
      startsOn,
      endsOn,
      entrants: c.entries.map((e) => ({ userId: e.userId, name: e.user.name })),
      workouts: workouts.flatMap((w) => (w.finishedAt ? [{ userId: w.userId, finishedAt: w.finishedAt }] : [])),
    });
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
      entrants: c.entries.length,
      top: ranking.slice(0, 10),
    });
  }
  const order = { ACTIVE: 0, UPCOMING: 1, ENDED: 2 } as const;
  return out.sort((a, b) => order[a.status] - order[b.status]);
}

export async function createChallenge(
  ownerUserId: string,
  gymId: string,
  raw: { title?: unknown; description?: unknown; metric?: unknown; startsOn?: unknown; endsOn?: unknown; prize?: unknown },
  today = todayArgentina(),
): Promise<{ ok: true; id: string } | { error: 'NOT_OWNER' | 'TITLE' | 'DATES' | 'TOO_LONG' | 'TOO_MANY' | 'PAST' }> {
  const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerUserId, status: 'ACTIVE' }, select: { id: true } });
  if (!gym) return { error: 'NOT_OWNER' };
  const clean = cleanChallenge(raw);
  if ('error' in clean) return { error: clean.error };
  if (clean.endsOn < today) return { error: 'PAST' };
  const open = await prisma.gymChallenge.count({ where: { gymId, endsOn: { gte: new Date(`${today}T00:00:00.000Z`) } } });
  if (open >= MAX_OPEN_CHALLENGES) return { error: 'TOO_MANY' };
  const created = await prisma.gymChallenge.create({
    data: {
      gymId,
      title: clean.title,
      description: clean.description || null,
      metric: clean.metric,
      startsOn: new Date(`${clean.startsOn}T00:00:00.000Z`),
      endsOn: new Date(`${clean.endsOn}T00:00:00.000Z`),
      prize: clean.prize || null,
    },
    select: { id: true },
  });
  return { ok: true, id: created.id };
}

export async function deleteChallenge(ownerUserId: string, id: string): Promise<boolean> {
  const res = await prisma.gymChallenge.deleteMany({ where: { id, gym: { ownerUserId } } });
  return res.count > 0;
}
