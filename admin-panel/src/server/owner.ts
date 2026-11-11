import 'server-only';
import { after } from 'next/server';
import { prisma } from './db';
import { sendAlert } from './alerts';
import { parseGymProfile, specialtyByKey, type GymProfile } from '@/features/gym/catalog';
import { asInviteStatus, MAX_INVITES_PER_REQUEST, parseEmailList, type InviteStatus } from '@/features/gym/logic';

/**
 * Lo que ve y hace el dueño de un gimnasio en su panel. Cliente global a propósito: cada función vuelve a
 * comprobar que la cuenta sea la dueña de ese gimnasio.
 */

/* ---------- Dueño del gimnasio ---------- */

/** El gimnasio del que esta cuenta es dueña (el más reciente si hubiera más de uno), o null. */
export async function getOwnedGym(userId: string): Promise<{ id: string; name: string } | null> {
  const g = await prisma.gym.findFirst({
    // También los pendientes: el dueño ya puede entrar a su panel mientras el gimnasio está en revisión.
    where: { ownerUserId: userId, status: { in: ['ACTIVE', 'SUSPENDED', 'PENDING'] } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true },
  });
  return g ?? null;
}

/** Días sin entrenar a partir de los cuales un socio cuenta como "en riesgo de irse". */
export const INACTIVE_DAYS = 10;

export interface OwnerView {
  gymId: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  inviteCode: string | null;
  memberLimit: number;
  activeMembers: number;
  /** Lugares del cupo usados: solo los socios que el gimnasio invitó (los que pagan por su cuenta no ocupan cupo). */
  cupoUsed: number;
  /** Gente que llegó por tu página y paga su plan por su cuenta (no ocupa cupo ni se te cobra). */
  webMembers: number;
  /** Socios que completaron un entrenamiento en los últimos 7 días. */
  trainedThisWeek: number;
  /** Socios que llevan 10 días o más sin entrenar (sólo el número: nunca quiénes, salvo los que lo permiten). */
  inactiveCount: number;
  /** Sólo los socios que aceptaron compartir su nombre y su actividad. */
  sharedMembers: Array<{ name: string; daysSinceLastWorkout: number | null; joinedDaysAgo: number }>;
  hiddenMembers: number;
  specialty: string | null;
  profile: GymProfile;
  /** Lo que paga el gimnasio por cada socio, por mes (US$). */
  pricePerMember: number;
  /** ARS o USD. */
  currency: 'ARS' | 'USD';
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Lo que ve el dueño de su gimnasio. Devuelve null si esa cuenta no es la dueña de ese gimnasio. */
export async function getOwnerView(userId: string, gymId: string): Promise<OwnerView | null> {
  const gym = await prisma.gym.findFirst({
    where: { id: gymId, ownerUserId: userId, status: { in: ['ACTIVE', 'SUSPENDED', 'PENDING'] } },
  });
  if (!gym) return null;
  const members = await prisma.gymMember.findMany({
    where: { gymId, status: 'ACTIVE' },
    select: { userId: true, shareActivity: true, joinedAt: true, source: true, user: { select: { name: true } } },
  });
  const webMembers = members.filter((m) => m.source === 'WEB').length;
  const now = Date.now();
  const last = members.length
    ? await prisma.workout.groupBy({
        by: ['userId'],
        where: { userId: { in: members.map((m) => m.userId) }, status: 'COMPLETED', finishedAt: { not: null } },
        _max: { finishedAt: true },
      })
    : [];
  const lastById = new Map(last.map((l) => [l.userId, l._max.finishedAt]));
  const daysSince = (d: Date | null | undefined) => (d ? Math.floor((now - d.getTime()) / DAY_MS) : null);

  let trainedThisWeek = 0;
  let inactiveCount = 0;
  for (const m of members) {
    const d = daysSince(lastById.get(m.userId));
    if (d !== null && d < 7) trainedThisWeek += 1;
    // Sin ningún entrenamiento cuenta como inactivo recién pasados los 10 días desde que entró.
    const idle = d !== null ? d : Math.floor((now - m.joinedAt.getTime()) / DAY_MS);
    if (idle >= INACTIVE_DAYS) inactiveCount += 1;
  }
  const shared = members
    .filter((m) => m.shareActivity)
    .map((m) => ({
      name: m.user.name?.trim() || 'Socio',
      daysSinceLastWorkout: daysSince(lastById.get(m.userId)),
      joinedDaysAgo: Math.floor((now - m.joinedAt.getTime()) / DAY_MS),
    }))
    // Primero los que llevan más sin entrenar (los que hay que llamar).
    .sort((a, b) => (b.daysSinceLastWorkout ?? 9999) - (a.daysSinceLastWorkout ?? 9999));

  return {
    gymId: gym.id,
    name: gym.name,
    status: gym.status === 'SUSPENDED' ? 'SUSPENDED' : gym.status === 'PENDING' ? 'PENDING' : 'ACTIVE',
    inviteCode: gym.inviteCode,
    memberLimit: gym.memberLimit,
    activeMembers: members.length,
    cupoUsed: members.length - webMembers,
    webMembers,
    trainedThisWeek,
    inactiveCount,
    sharedMembers: shared,
    hiddenMembers: members.length - shared.length,
    specialty: gym.specialty,
    profile: parseGymProfile(gym.equipment),
    pricePerMember: Number(gym.pricePerMember),
    currency: gym.currency === 'USD' ? 'USD' : 'ARS',
  };
}

/** El dueño guarda las máquinas y la especialidad de SU gimnasio. */
export async function saveOwnGymProfile(
  userId: string,
  gymId: string,
  input: { specialty: string | null; specialtyDetail: string; items: string[]; notes: string },
): Promise<boolean> {
  const specialty = input.specialty && specialtyByKey(input.specialty) ? input.specialty : null;
  const profile = parseGymProfile({ items: input.items, notes: input.notes, specialtyDetail: input.specialtyDetail });
  const res = await prisma.gym.updateMany({
    where: { id: gymId, ownerUserId: userId },
    data: { specialty, equipment: { ...profile } },
  });
  return res.count > 0;
}
