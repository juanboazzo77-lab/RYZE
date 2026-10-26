import 'server-only';
import { DateTime } from 'luxon';
import type { Profile } from '@prisma/client';
import { prisma } from './db';
import { TRIAL_DAYS } from './entitlements';
import { addDaysISO, localTodayISO, weekStartISO } from '@/lib/date';
import { workoutStreak } from '@/features/dashboard/compute';
import {
  generateCode,
  normalizeCode,
  rankFriends,
  type FriendStats,
} from '@/features/friends/logic';

/**
 * Invitaciones y amigos. Son datos de DOS personas, así que no pasan por `forUser`: acá se
 * accede con el cliente global y cada función acota por el `userId` que recibe. Lo único que
 * un amigo ve del otro es el nombre y cuántos entrenamientos hizo.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Días de acceso completo que ganan los dos al usar un código. */
export const REFERRAL_BONUS_DAYS = 7;
/** Tope de personas por las que alguien puede ganar días (evita cuentas de mentira). */
export const MAX_REFERRAL_REWARDS = 10;
/** El código sólo da días a cuentas recién creadas. */
const NEW_ACCOUNT_DAYS = 14;
/** Límite de amigos en el ranking. */
const MAX_FRIENDS = 30;

/** Devuelve el código de la persona; la primera vez lo crea. */
export async function ensureReferralCode(userId: string): Promise<string> {
  const current = await prisma.profile.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (current?.referralCode) return current.referralCode;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateCode();
    try {
      const res = await prisma.profile.updateMany({
        where: { id: userId, referralCode: null },
        data: { referralCode: code },
      });
      if (res.count > 0) return code;
      // Otro request ya le puso uno entre medio.
      const again = await prisma.profile.findUnique({ where: { id: userId }, select: { referralCode: true } });
      if (again?.referralCode) return again.referralCode;
    } catch (e) {
      // Código repetido (único): se prueba con otro.
      if ((e as { code?: string }).code !== 'P2002') throw e;
    }
  }
  throw new Error('no se pudo generar el código de invitación');
}

/** Suma días de acceso completo: arrancan cuando termina lo que ya tuviera (prueba o regalo). */
async function extendBonus(userId: string, days: number): Promise<void> {
  const ent = await prisma.entitlement.findUnique({
    where: { userId },
    select: { bonusUntil: true, createdAt: true },
  });
  if (!ent) return;
  const base = Math.max(
    Date.now(),
    ent.bonusUntil?.getTime() ?? 0,
    ent.createdAt.getTime() + TRIAL_DAYS * DAY_MS,
  );
  await prisma.entitlement.update({
    where: { userId },
    data: { bonusUntil: new Date(base + days * DAY_MS) },
  });
}

export type RedeemResult =
  | { ok: true; friendName: string; rewarded: boolean; alreadyFriends: boolean }
  | { ok: false; error: 'INVALID' | 'NOT_FOUND' | 'SELF' | 'ALREADY_FRIENDS' };

/**
 * Usa el código de otra persona: quedan como amigos y, si la cuenta es nueva y todavía no usó
 * ningún código, los dos ganan días de acceso completo.
 */
export async function redeemCode(userId: string, rawCode: string): Promise<RedeemResult> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: 'INVALID' };

  const owner = await prisma.profile.findUnique({
    where: { referralCode: code },
    select: { id: true, name: true },
  });
  if (!owner) return { ok: false, error: 'NOT_FOUND' };
  if (owner.id === userId) return { ok: false, error: 'SELF' };

  const me = await prisma.profile.findUnique({
    where: { id: userId },
    select: { referredById: true, createdAt: true },
  });
  if (!me) return { ok: false, error: 'INVALID' };

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: owner.id },
        { requesterId: owner.id, addresseeId: userId },
      ],
    },
    select: { id: true },
  });
  if (!existing) {
    await prisma.friendship.create({ data: { requesterId: userId, addresseeId: owner.id } });
  }

  let rewarded = false;
  const isNew = Date.now() - me.createdAt.getTime() < NEW_ACCOUNT_DAYS * DAY_MS;
  if (!me.referredById && isNew) {
    // updateMany con la condición en el where: si dos requests llegan juntos, sólo uno gana.
    const claimed = await prisma.profile.updateMany({
      where: { id: userId, referredById: null },
      data: { referredById: owner.id },
    });
    if (claimed.count > 0) {
      rewarded = true;
      await extendBonus(userId, REFERRAL_BONUS_DAYS);
      const already = await prisma.profile.count({ where: { referredById: owner.id } });
      if (already <= MAX_REFERRAL_REWARDS) await extendBonus(owner.id, REFERRAL_BONUS_DAYS);
    }
  }

  if (existing && !rewarded) return { ok: false, error: 'ALREADY_FRIENDS' };
  return { ok: true, friendName: owner.name ?? '', rewarded, alreadyFriends: Boolean(existing) };
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { requesterId: userId, addresseeId: friendId },
        { requesterId: friendId, addresseeId: userId },
      ],
    },
  });
}

export interface FriendsOverview {
  code: string;
  /** Cuántas personas usaron el código de esta persona. */
  invited: number;
  ranking: FriendStats[];
}

/** Código propio + ranking de la semana (la persona y sus amigos). */
export async function getFriendsOverview(profile: Profile): Promise<FriendsOverview> {
  const code = await ensureReferralCode(profile.id);
  const invited = await prisma.profile.count({ where: { referredById: profile.id } });

  const links = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: profile.id }, { addresseeId: profile.id }] },
    select: { requesterId: true, addresseeId: true },
    take: MAX_FRIENDS,
  });
  const friendIds = links.map((l) => (l.requesterId === profile.id ? l.addresseeId : l.requesterId));
  const ids = [profile.id, ...friendIds];

  const people = await prisma.profile.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, timezone: true },
  });
  const since = new Date(Date.now() - 60 * DAY_MS);
  const workouts = await prisma.workout.findMany({
    where: { userId: { in: ids }, status: 'COMPLETED', finishedAt: { gte: since } },
    select: { userId: true, finishedAt: true },
  });

  // La semana se mide con la zona y el inicio de semana de quien mira, para que sea la misma
  // para todos; la racha, con la zona de cada uno.
  const weekStart = weekStartISO(localTodayISO(profile.timezone), profile.weekStart);
  const rows: FriendStats[] = people.map((p) => {
    const days = new Set<string>();
    for (const w of workouts) {
      if (w.userId !== p.id || !w.finishedAt) continue;
      const d = DateTime.fromJSDate(w.finishedAt).setZone(p.timezone).toISODate();
      if (d) days.add(d);
    }
    const weekWorkouts = workouts.filter((w) => {
      if (w.userId !== p.id || !w.finishedAt) return false;
      const d = DateTime.fromJSDate(w.finishedAt).setZone(profile.timezone).toISODate();
      return d !== null && d >= weekStart;
    }).length;
    return {
      id: p.id,
      name: (p.name ?? '').trim().split(/\s+/)[0] ?? '',
      isMe: p.id === profile.id,
      weekWorkouts,
      streak: workoutStreak(days, localTodayISO(p.timezone), addDaysISO),
    };
  });

  return { code, invited, ranking: rankFriends(rows) };
}
