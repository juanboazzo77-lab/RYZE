import 'server-only';
import { prisma } from './db';
import { gymContextLines, parseGymProfile } from '@/features/gym/catalog';
import { normalizeHexColor, safeLogoUrl } from '@/features/gym/brand';
import { asGymStatus, normalizeGymCode, type JoinError } from '@/features/gym/logic';
import { trialForJoin } from '@/features/gym/trial';
import { recordGymReferral } from './gym-referrals';

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
  /** Código público del gimnasio (para mandar a la persona a su página). */
  inviteCode: string | null;
  /** Cómo entró: INVITE | WEB | CODE (con el código: tiene prueba de 3 días). */
  source: string;
  /** Fin de la prueba de quien entró con el código. */
  trialEndsAt: Date | null;
}

/** El gimnasio activo al que pertenece la persona (con el gimnasio también activo), si tiene uno. */
export async function getMemberGym(userId: string): Promise<MemberGym | null> {
  const m = await prisma.gymMember.findFirst({
    where: { userId, status: 'ACTIVE', gym: { status: 'ACTIVE' } },
    select: { gymId: true, source: true, trialEndsAt: true, gym: { select: { name: true, logoUrl: true, brandColor: true, inviteCode: true } } },
  });
  return m
    ? { gymId: m.gymId, name: m.gym.name, logoUrl: safeLogoUrl(m.gym.logoUrl), brandColor: normalizeHexColor(m.gym.brandColor), inviteCode: m.gym.inviteCode, source: m.source, trialEndsAt: m.trialEndsAt }
    : null;
}

/** Quién es el gimnasio de un código (para mostrárselo antes de aceptar). Sólo si está activo. */
export async function previewGymCode(rawCode: string): Promise<{ name: string; city: string | null } | null> {
  const code = normalizeGymCode(rawCode);
  if (!code) return null;
  const g = await prisma.gym.findUnique({ where: { inviteCode: code }, select: { name: true, city: true, status: true } });
  return g && asGymStatus(g.status) === 'ACTIVE' ? { name: g.name, city: g.city } : null;
}

/**
 * La persona entra a un gimnasio con su código: queda conectada con una prueba gratis de 3 días y después tiene que pagar
 * su plan (por la página del gimnasio, con el QR, o uno propio). La prueba se da una sola vez por persona. No ocupa
 * cupo ni se le cobra al gimnasio.
 */
export async function redeemGymCode(
  userId: string,
  rawCode: string,
  /** El socio aceptó que su gimnasio vea su nombre y su actividad (lo elige al ingresar el código). */
  shareActivity = false,
  now = new Date(),
): Promise<{ ok: true; gymName: string; trialEndsAt: Date } | { error: JoinError }> {
  const code = normalizeGymCode(rawCode);
  if (!code) return { error: 'INVALID_CODE' };
  const gym = await prisma.gym.findFirst({ where: { inviteCode: code, status: 'ACTIVE' }, select: { id: true, name: true } });
  if (!gym) return { error: 'INVALID_CODE' };

  const existing = await prisma.gymMember.findUnique({ where: { userId }, select: { status: true, trialEndsAt: true } });
  if (existing?.status === 'ACTIVE') return { error: 'ALREADY_MEMBER' };
  const trialEndsAt = trialForJoin(existing?.trialEndsAt, now);

  await prisma.gymMember.upsert({
    where: { userId },
    create: { gymId: gym.id, userId, source: 'CODE', shareActivity, trialEndsAt },
    update: { gymId: gym.id, status: 'ACTIVE', source: 'CODE', joinedAt: now, endedAt: null, shareActivity, trialEndsAt },
  });
  await recordGymReferral(userId, gym.id).catch((e) => console.error('[gimnasio] no se pudo anotar de dónde vino:', e instanceof Error ? e.message : e));
  return { ok: true, gymName: gym.name, trialEndsAt };
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
