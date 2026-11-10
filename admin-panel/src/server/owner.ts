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
    where: { gymId, status: 'ACTIVE', source: { not: 'WEB' } },
    select: { userId: true, shareActivity: true, joinedAt: true, user: { select: { name: true } } },
  });
  const webMembers = await prisma.gymMember.count({ where: { gymId, status: 'ACTIVE', source: 'WEB' } });
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

/* ---------- Invitaciones de socios por mail ---------- */

export interface InviteRow {
  id: string;
  email: string;
  status: InviteStatus;
  requestedAt: string;
  /** El administrador ya confirmó el pago de este alta. */
  paid: boolean;
}

export interface RequestInvitesResult {
  /** Mails nuevos que quedaron pendientes de tu aprobación. */
  added: number;
  /** Ya estaban pedidos, aprobados o adentro. */
  skipped: number;
  invalid: string[];
}

/**
 * El dueño carga los mails de sus clientes. Quedan PENDIENTES: no sale ningún mail hasta que el administrador
 * los aprueba. Sólo un gimnasio activo puede pedir, y sólo su dueño.
 */
export async function requestInvites(
  ownerUserId: string,
  gymId: string,
  rawList: string,
): Promise<RequestInvitesResult | { error: 'NOT_OWNER' | 'NOT_ACTIVE' | 'EMPTY' | 'TOO_MANY' }> {
  const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerUserId }, select: { name: true, status: true } });
  if (!gym) return { error: 'NOT_OWNER' };
  if (gym.status !== 'ACTIVE') return { error: 'NOT_ACTIVE' };

  const { valid, invalid } = parseEmailList(rawList);
  if (valid.length === 0) return { error: 'EMPTY' };
  if (valid.length > MAX_INVITES_PER_REQUEST) return { error: 'TOO_MANY' };

  const existing = await prisma.gymInvite.findMany({ where: { gymId, email: { in: valid } }, select: { id: true, email: true, status: true } });
  const byEmail = new Map(existing.map((e) => [e.email, e]));
  // Los que ya son socios activos de este gimnasio no se vuelven a invitar.
  const memberRows = await prisma.gymMember.findMany({
    where: { gymId, status: 'ACTIVE', source: { not: 'WEB' }, user: { email: { in: valid, mode: 'insensitive' } } },
    select: { user: { select: { email: true } } },
  });
  const alreadyMembers = new Set(memberRows.map((m) => m.user.email.toLowerCase()));

  const toCreate: string[] = [];
  const toReopen: string[] = [];
  let skipped = 0;
  for (const email of valid) {
    const found = byEmail.get(email);
    if (alreadyMembers.has(email)) skipped += 1;
    else if (!found) toCreate.push(email);
    else if (found.status === 'REJECTED') toReopen.push(found.id);
    else skipped += 1;
  }
  if (toCreate.length > 0) {
    await prisma.gymInvite.createMany({ data: toCreate.map((email) => ({ gymId, email })), skipDuplicates: true });
  }
  if (toReopen.length > 0) {
    await prisma.gymInvite.updateMany({ where: { id: { in: toReopen } }, data: { status: 'PENDING', decidedAt: null, paidAt: null, requestedAt: new Date() } });
  }
  const added = toCreate.length + toReopen.length;

  if (added > 0) {
    const text = [
      `"${gym.name}" pidió dar de alta a ${added} ${added === 1 ? 'socio' : 'socios'}.`,
      '',
      'Cuando te llegue el comprobante de pago (por mail o WhatsApp), entrá al panel de gestión, a Altas: marcá "Pago recibido" y aprobá. Recién ahí cada persona recibe su invitación por mail.',
    ].join('\n');
    const subject = `Altas pendientes: ${gym.name} (${added})`;
    try {
      after(() => sendAlert({ subject, text }));
    } catch {
      void sendAlert({ subject, text });
    }
  }
  return { added, skipped, invalid };
}

/** Los pedidos de un gimnasio, para que su dueño vea en qué está cada uno. */
export async function listInvitesForOwner(ownerUserId: string, gymId: string): Promise<InviteRow[] | null> {
  const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerUserId }, select: { id: true } });
  if (!gym) return null;
  const rows = await prisma.gymInvite.findMany({ where: { gymId }, orderBy: { requestedAt: 'desc' }, take: 500 });
  return rows.map((r) => ({ id: r.id, email: r.email, status: asInviteStatus(r.status), requestedAt: r.requestedAt.toISOString(), paid: !!r.paidAt }));
}

