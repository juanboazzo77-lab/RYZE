import 'server-only';
import { after } from 'next/server';
import { prisma } from './db';
import { sendAlert } from './alerts';
import { gymContextLines, parseGymProfile, specialtyByKey, type GymProfile } from '@/features/gym/catalog';
import {
  asGymStatus,
  asInviteStatus,
  canJoin,
  MAX_INVITES_PER_REQUEST,
  MAX_MEMBER_ESTIMATE,
  normalizeEmail,
  normalizeGymCode,
  parseEmailList,
  type InviteStatus,
  type JoinError,
} from '@/features/gym/logic';

/**
 * Gimnasios. El gimnasio se anota solo (queda PENDING); el admin lo aprueba, le fija el cupo de socios y
 * recién ahí tiene código. Un socio que entra con el código usa Forza AI sin pagar mientras el gimnasio esté
 * activo. Estas funciones usan el cliente global a propósito: cruzan datos de varias personas y las llama
 * sólo el admin o el propio socio (siempre sobre su propia fila).
 */

/* ---------- Alta (formulario público) ---------- */

export interface GymApplicationInput {
  name: string;
  city?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  memberEstimate?: number;
  message?: string;
}

const clip = (v: string | undefined, max: number) => (v ?? '').trim().slice(0, max);

/** Guarda la solicitud. Si ya hay una pendiente con ese mail no se duplica (devuelve ok igual). */
export async function submitGymApplication(input: GymApplicationInput): Promise<{ ok: true } | { error: 'INVALID' | 'TOO_MANY' }> {
  const name = clip(input.name, 120);
  const contactName = clip(input.contactName, 120);
  const contactEmail = clip(input.contactEmail, 200).toLowerCase();
  if (name.length < 2 || contactName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { error: 'INVALID' };
  }
  const estimate =
    typeof input.memberEstimate === 'number' && Number.isFinite(input.memberEstimate)
      ? Math.min(MAX_MEMBER_ESTIMATE, Math.max(0, Math.round(input.memberEstimate)))
      : null;

  const pending = await prisma.gym.count({ where: { contactEmail, status: 'PENDING' } });
  if (pending > 0) return { ok: true };
  // Freno simple contra el abuso del formulario público.
  const lastDay = await prisma.gym.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
  if (lastDay >= 50) return { error: 'TOO_MANY' };

  await prisma.gym.create({
    data: {
      name,
      city: clip(input.city, 80) || null,
      contactName,
      contactEmail,
      contactPhone: clip(input.contactPhone, 40) || null,
      memberEstimate: estimate,
      message: clip(input.message, 600) || null,
    },
  });
  // Aviso por mail al equipo (no frena ni rompe el alta si falla).
  const text = [
    `Un gimnasio pidió sumarse a Forza AI.`,
    '',
    `Gimnasio: ${name}${clip(input.city, 80) ? ` (${clip(input.city, 80)})` : ''}`,
    `Contacto: ${contactName} · ${contactEmail}${clip(input.contactPhone, 40) ? ` · ${clip(input.contactPhone, 40)}` : ''}`,
    estimate ? `Dice tener unos ${estimate} socios.` : '',
    clip(input.message, 600) ? `Mensaje: ${clip(input.message, 600)}` : '',
    '',
    'Aprobalo o rechazalo en el panel de gestión, en Gimnasios.',
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n');
  try {
    after(() => sendAlert({ subject: `Gimnasio nuevo: ${name}`, text }));
  } catch {
    void sendAlert({ subject: `Gimnasio nuevo: ${name}`, text });
  }
  return { ok: true };
}

/* ---------- Socio ---------- */

export interface MemberGym {
  gymId: string;
  name: string;
}

/** El gimnasio activo al que pertenece la persona (con el gimnasio también activo), si tiene uno. */
export async function getMemberGym(userId: string): Promise<MemberGym | null> {
  const m = await prisma.gymMember.findFirst({
    where: { userId, status: 'ACTIVE', gym: { status: 'ACTIVE' } },
    select: { gymId: true, gym: { select: { name: true } } },
  });
  return m ? { gymId: m.gymId, name: m.gym.name } : null;
}

/** Quién es el gimnasio de un código (para mostrárselo antes de aceptar). Sólo si está activo. */
export async function previewGymCode(rawCode: string): Promise<{ name: string; city: string | null } | null> {
  const code = normalizeGymCode(rawCode);
  if (!code) return null;
  const g = await prisma.gym.findUnique({ where: { inviteCode: code }, select: { name: true, city: true, status: true } });
  return g && asGymStatus(g.status) === 'ACTIVE' ? { name: g.name, city: g.city } : null;
}

/** El socio entra con el código. Se bloquea la fila del gimnasio para que el cupo no se pase por dos a la vez. */
export async function redeemGymCode(
  userId: string,
  rawCode: string,
  /** El socio aceptó que su gimnasio vea su nombre y su actividad (lo elige al ingresar el código). */
  shareActivity = false,
): Promise<{ ok: true; gymName: string } | { error: JoinError }> {
  const code = normalizeGymCode(rawCode);
  if (!code) return { error: 'INVALID_CODE' };
  const gym = await prisma.gym.findUnique({ where: { inviteCode: code }, select: { id: true } });
  if (!gym) return { error: 'INVALID_CODE' };

  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ name: string; status: string; member_limit: number }>>`
      SELECT name, status, member_limit FROM gym WHERE id = ${gym.id}::uuid FOR UPDATE`;
    const g = locked[0];
    if (!g) return { error: 'INVALID_CODE' as const };

    const existing = await tx.gymMember.findUnique({ where: { userId }, select: { gymId: true, status: true } });
    if (existing?.status === 'ACTIVE') {
      return { error: 'ALREADY_MEMBER' as const };
    }
    const activeMembers = await tx.gymMember.count({ where: { gymId: gym.id, status: 'ACTIVE' } });
    const blocked = canJoin({ status: g.status, memberLimit: g.member_limit, activeMembers });
    if (blocked) return { error: blocked };

    await tx.gymMember.upsert({
      where: { userId },
      create: { gymId: gym.id, userId, shareActivity },
      update: { gymId: gym.id, status: 'ACTIVE', joinedAt: new Date(), endedAt: null, shareActivity },
    });
    return { ok: true as const, gymName: g.name };
  });
}

/** El socio se va del gimnasio y vuelve a su plan normal. */
export async function leaveGym(userId: string): Promise<boolean> {
  const res = await prisma.gymMember.updateMany({
    where: { userId, status: 'ACTIVE' },
    data: { status: 'ENDED', endedAt: new Date() },
  });
  return res.count > 0;
}

/** Lo que la IA tiene que saber del gimnasio del socio (máquinas y especialidad), o null si no es socio de uno activo. */
export async function getMemberGymContext(userId: string): Promise<string[] | null> {
  const m = await prisma.gymMember.findFirst({
    where: { userId, status: 'ACTIVE', gym: { status: 'ACTIVE' } },
    select: { gym: { select: { name: true, specialty: true, equipment: true } } },
  });
  if (!m) return null;
  return gymContextLines({ name: m.gym.name, specialty: m.gym.specialty, profile: parseGymProfile(m.gym.equipment) });
}

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
  pricePerMemberUsd: number;
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
    select: { userId: true, shareActivity: true, joinedAt: true, user: { select: { name: true } } },
  });
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
    trainedThisWeek,
    inactiveCount,
    sharedMembers: shared,
    hiddenMembers: members.length - shared.length,
    specialty: gym.specialty,
    profile: parseGymProfile(gym.equipment),
    pricePerMemberUsd: Number(gym.pricePerMemberUsd),
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

/* ---------- Permiso del socio ---------- */

/** El socio decide si su gimnasio puede ver su nombre y cuándo entrenó por última vez. */
export async function setShareActivity(userId: string, share: boolean): Promise<boolean> {
  const res = await prisma.gymMember.updateMany({ where: { userId, status: 'ACTIVE' }, data: { shareActivity: share } });
  return res.count > 0;
}

export async function getShareActivity(userId: string): Promise<boolean> {
  const m = await prisma.gymMember.findFirst({ where: { userId, status: 'ACTIVE' }, select: { shareActivity: true } });
  return m?.shareActivity ?? false;
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
    where: { gymId, status: 'ACTIVE', user: { email: { in: valid, mode: 'insensitive' } } },
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

export interface PendingInvite {
  inviteId: string;
  gymName: string;
}

/** La invitación aprobada que tiene esta persona (por su mail) y todavía no aceptó, si no es ya socia de un gimnasio. */
export async function getApprovedInviteFor(userId: string, email: string): Promise<PendingInvite | null> {
  const clean = normalizeEmail(email);
  if (!clean) return null;
  const member = await prisma.gymMember.findFirst({ where: { userId, status: 'ACTIVE' }, select: { id: true } });
  if (member) return null;
  const inv = await prisma.gymInvite.findFirst({
    where: { email: clean, status: 'APPROVED', gym: { status: 'ACTIVE' } },
    orderBy: { decidedAt: 'desc' },
    select: { id: true, gym: { select: { name: true } } },
  });
  return inv ? { inviteId: inv.id, gymName: inv.gym.name } : null;
}

/**
 * La persona acepta la invitación: queda como socia del gimnasio. Comprueba que la invitación sea de SU mail y
 * esté aprobada; el lugar ya estaba reservado en el cupo cuando se aprobó.
 */
export async function acceptInvite(
  userId: string,
  email: string,
  inviteId: string,
  shareActivity: boolean,
): Promise<{ ok: true; gymName: string } | { error: 'NOT_FOUND' | 'ALREADY_MEMBER' }> {
  const clean = normalizeEmail(email);
  return prisma.$transaction(async (tx) => {
    const inv = await tx.gymInvite.findFirst({
      where: { id: inviteId, email: clean, status: 'APPROVED', gym: { status: 'ACTIVE' } },
      select: { id: true, gymId: true, gym: { select: { name: true } } },
    });
    if (!inv) return { error: 'NOT_FOUND' as const };
    const existing = await tx.gymMember.findUnique({ where: { userId }, select: { status: true } });
    if (existing?.status === 'ACTIVE') return { error: 'ALREADY_MEMBER' as const };
    await tx.gymMember.upsert({
      where: { userId },
      create: { gymId: inv.gymId, userId, shareActivity },
      update: { gymId: inv.gymId, status: 'ACTIVE', joinedAt: new Date(), endedAt: null, shareActivity },
    });
    await tx.gymInvite.update({ where: { id: inv.id }, data: { status: 'JOINED', joinedAt: new Date() } });
    return { ok: true as const, gymName: inv.gym.name };
  });
}
