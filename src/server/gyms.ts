import 'server-only';
import { prisma } from './db';
import { gymContextLines, parseGymProfile } from '@/features/gym/catalog';
import { normalizeHexColor, safeLogoUrl } from '@/features/gym/brand';
import { asGymStatus, canJoin, normalizeEmail, normalizeGymCode, type JoinError } from '@/features/gym/logic';

/**
 * Gimnasios. El gimnasio se anota solo (queda PENDING); el admin lo aprueba, le fija el cupo de socios y
 * recién ahí tiene código. Un socio que entra con el código usa Forza AI sin pagar mientras el gimnasio esté
 * activo. Estas funciones usan el cliente global a propósito: cruzan datos de varias personas y las llama
 * sólo el admin o el propio socio (siempre sobre su propia fila).
 */

/* ---------- Socio ---------- */

export interface MemberGym {
  gymId: string;
  name: string;
  /** Marca del gimnasio: logo (dirección https) y color (#rrggbb), o null. */
  logoUrl: string | null;
  brandColor: string | null;
}

/** El gimnasio activo al que pertenece la persona (con el gimnasio también activo), si tiene uno. */
export async function getMemberGym(userId: string): Promise<MemberGym | null> {
  const m = await prisma.gymMember.findFirst({
    where: { userId, status: 'ACTIVE', gym: { status: 'ACTIVE' } },
    select: { gymId: true, gym: { select: { name: true, logoUrl: true, brandColor: true } } },
  });
  return m ? { gymId: m.gymId, name: m.gym.name, logoUrl: safeLogoUrl(m.gym.logoUrl), brandColor: normalizeHexColor(m.gym.brandColor) } : null;
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
