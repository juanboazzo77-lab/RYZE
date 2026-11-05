import 'server-only';
import { parseGymProfile, specialtyByKey, type GymProfile } from '@/features/gym/catalog';
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import {
  asGymStatus,
  generateGymCode,
  MAX_MEMBER_LIMIT,
  type GymStatus,
} from '@/features/gym/logic';

/**
 * Gimnasios. El gimnasio se anota solo (queda PENDING); el admin lo aprueba, le fija el cupo de socios y
 * recién ahí tiene código. Un socio que entra con el código usa Forza AI sin pagar mientras el gimnasio esté
 * activo. Estas funciones usan el cliente global a propósito: cruzan datos de varias personas y las llama
 * sólo el admin o el propio socio (siempre sobre su propia fila).
 */

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

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
  specialty: string | null;
  profile: GymProfile;
  /** Mail de la cuenta de Forza AI que es dueña del gimnasio, si ya la vinculaste. */
  ownerEmail: string | null;
}

export async function listGymsForAdmin(): Promise<GymRow[]> {
  const gyms = await prisma.gym.findMany({ orderBy: { createdAt: 'desc' }, include: { owner: { select: { email: true } } } });
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
      specialty: g.specialty,
      profile: parseGymProfile(g.equipment),
      ownerEmail: g.owner?.email ?? null,
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

/** Guarda las máquinas y la especialidad del gimnasio (lo que la IA usa para armar rutinas de sus socios). */
export async function saveGymProfile(
  gymId: string,
  input: { specialty: string | null; specialtyDetail: string; items: string[]; notes: string },
): Promise<boolean> {
  const specialty = input.specialty && specialtyByKey(input.specialty) ? input.specialty : null;
  // Pasa por parseGymProfile: sólo quedan claves que existen y textos recortados.
  const profile = parseGymProfile({ items: input.items, notes: input.notes, specialtyDetail: input.specialtyDetail });
  const res = await prisma.gym.updateMany({ where: { id: gymId }, data: { specialty, equipment: { ...profile } } });
  return res.count > 0;
}

/**
 * Vincula un gimnasio con la cuenta de Forza AI de su dueño, por mail. Mail vacío = desvincular. Sólo se
 * puede con una cuenta que ya exista: la persona tiene que haberse registrado antes en la app.
 */
export async function setGymOwner(gymId: string, email: string): Promise<{ ok: true } | { error: 'NO_ACCOUNT' | 'NOT_FOUND' }> {
  const clean = email.trim().toLowerCase();
  if (clean === '') {
    const res = await prisma.gym.updateMany({ where: { id: gymId }, data: { ownerUserId: null } });
    return res.count > 0 ? { ok: true } : { error: 'NOT_FOUND' };
  }
  const profile = await prisma.profile.findFirst({ where: { email: { equals: clean, mode: 'insensitive' } }, select: { id: true } });
  if (!profile) return { error: 'NO_ACCOUNT' };
  const res = await prisma.gym.updateMany({ where: { id: gymId }, data: { ownerUserId: profile.id } });
  return res.count > 0 ? { ok: true } : { error: 'NOT_FOUND' };
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
