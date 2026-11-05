import 'server-only';
import { after } from 'next/server';
import { prisma } from './db';
import { sendAlert } from './alerts';
import { asGymStatus, canJoin, MAX_MEMBER_ESTIMATE, normalizeGymCode, type JoinError } from '@/features/gym/logic';

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
