import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import {
  asGymStatus,
  canJoin,
  generateGymCode,
  MAX_MEMBER_ESTIMATE,
  MAX_MEMBER_LIMIT,
  normalizeGymCode,
  type GymStatus,
  type JoinError,
} from '@/features/gym/logic';

/**
 * Gimnasios. El gimnasio se anota solo (queda PENDING); el admin lo aprueba, le fija el cupo de socios y
 * recién ahí tiene código. Un socio que entra con el código usa Forza AI sin pagar mientras el gimnasio esté
 * activo. Estas funciones usan el cliente global a propósito: cruzan datos de varias personas y las llama
 * sólo el admin o el propio socio (siempre sobre su propia fila).
 */

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

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
  return { ok: true };
}

/* ---------- Admin ---------- */

export interface GymRow {
  id: string;
  name: string;
  city: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  memberEstimate: number | null;
  message: string | null;
  status: GymStatus;
  memberLimit: number;
  inviteCode: string | null;
  createdAt: string;
  activeMembers: number;
  /** Socios que completaron un entrenamiento en los últimos 7 días. */
  trainedThisWeek: number;
}

export async function listGymsForAdmin(): Promise<GymRow[]> {
  const gyms = await prisma.gym.findMany({ orderBy: { createdAt: 'desc' } });
  if (gyms.length === 0) return [];
  const members = await prisma.gymMember.findMany({
    where: { status: 'ACTIVE' },
    select: { gymId: true, userId: true },
  });
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const trained = members.length
    ? await prisma.workout.findMany({
        where: { userId: { in: members.map((m) => m.userId) }, status: 'COMPLETED', finishedAt: { gte: since } },
        distinct: ['userId'],
        select: { userId: true },
      })
    : [];
  const trainedIds = new Set(trained.map((t) => t.userId));

  const rows = gyms.map((g) => {
    const mine = members.filter((m) => m.gymId === g.id);
    return {
      id: g.id,
      name: g.name,
      city: g.city,
      contactName: g.contactName,
      contactEmail: g.contactEmail,
      contactPhone: g.contactPhone,
      memberEstimate: g.memberEstimate,
      message: g.message,
      status: asGymStatus(g.status),
      memberLimit: g.memberLimit,
      inviteCode: g.inviteCode,
      createdAt: g.createdAt.toISOString(),
      activeMembers: mine.length,
      trainedThisWeek: mine.filter((m) => trainedIds.has(m.userId)).length,
    };
  });
  // Pendientes primero: son los que esperan una decisión.
  const order: Record<GymStatus, number> = { PENDING: 0, ACTIVE: 1, SUSPENDED: 2, REJECTED: 3 };
  return rows.sort((a, b) => order[a.status] - order[b.status]);
}

const validLimit = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_MEMBER_LIMIT;

/** Crea un código libre; reintenta si justo choca con otro. */
async function withFreshCode<T>(run: (code: string) => Promise<T>): Promise<T> {
  for (let i = 0; i < 6; i++) {
    try {
      return await run(generateGymCode());
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
  throw new Error('No se pudo generar un código libre');
}

/** Aprueba un gimnasio pendiente, le fija el cupo y le da su código. */
export async function approveGym(gymId: string, memberLimit: number): Promise<{ ok: true; code: string } | { error: 'INVALID' | 'NOT_FOUND' }> {
  if (!validLimit(memberLimit)) return { error: 'INVALID' };
  const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { status: true, inviteCode: true } });
  if (!gym) return { error: 'NOT_FOUND' };
  if (gym.inviteCode) {
    await prisma.gym.update({ where: { id: gymId }, data: { status: 'ACTIVE', memberLimit, approvedAt: new Date() } });
    return { ok: true, code: gym.inviteCode };
  }
  const code = await withFreshCode(async (c) => {
    await prisma.gym.update({ where: { id: gymId }, data: { status: 'ACTIVE', memberLimit, inviteCode: c, approvedAt: new Date() } });
    return c;
  });
  return { ok: true, code };
}

export async function rejectGym(gymId: string): Promise<boolean> {
  const res = await prisma.gym.updateMany({ where: { id: gymId, status: 'PENDING' }, data: { status: 'REJECTED' } });
  return res.count > 0;
}

/** Suspende (sus socios pierden el acceso gratis) o reactiva un gimnasio ya aprobado. */
export async function setGymSuspended(gymId: string, suspended: boolean): Promise<boolean> {
  const res = await prisma.gym.updateMany({
    where: { id: gymId, status: suspended ? 'ACTIVE' : 'SUSPENDED' },
    data: { status: suspended ? 'SUSPENDED' : 'ACTIVE' },
  });
  return res.count > 0;
}

export async function setMemberLimit(gymId: string, memberLimit: number): Promise<boolean> {
  if (!validLimit(memberLimit)) return false;
  const res = await prisma.gym.updateMany({ where: { id: gymId, status: { in: ['ACTIVE', 'SUSPENDED'] } }, data: { memberLimit } });
  return res.count > 0;
}

/** Cambia el código (el anterior deja de servir; los socios que ya entraron siguen adentro). */
export async function regenerateGymCode(gymId: string): Promise<string | null> {
  const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { status: true } });
  if (!gym || !['ACTIVE', 'SUSPENDED'].includes(gym.status)) return null;
  return withFreshCode(async (c) => {
    await prisma.gym.update({ where: { id: gymId }, data: { inviteCode: c } });
    return c;
  });
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
export async function redeemGymCode(userId: string, rawCode: string): Promise<{ ok: true; gymName: string } | { error: JoinError }> {
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
      create: { gymId: gym.id, userId },
      update: { gymId: gym.id, status: 'ACTIVE', joinedAt: new Date(), endedAt: null },
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
