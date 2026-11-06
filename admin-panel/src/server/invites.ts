import 'server-only';
import { prisma } from './db';
import { sendMail } from './alerts';
import { approvableCount } from '@/features/gym/logic';

/**
 * Altas de socios por mail. El gimnasio carga los mails (PENDING); desde acá se aprueban (se manda el mail de
 * invitación y se reserva un lugar del cupo) o se rechazan. Cuando la persona entra con ese mail y acepta,
 * pasa a JOINED (eso lo hace la app).
 */

const APP_URL = (process.env.APP_URL || 'https://www.forzaai.app').replace(/\/$/, '');

/** Mail de invitación al cliente. Función pura (se prueba sin base de datos). */
export function invitationEmail(gymName: string): { subject: string; text: string } {
  return {
    subject: `${gymName} te invita a Forza AI`,
    text: [
      'Hola,',
      '',
      `${gymName} te invita a unirte a Forza AI, tu entrenador con inteligencia artificial. Es gratis para vos: tu gimnasio se hace cargo.`,
      '',
      'Con tu invitación tenés:',
      `- Un plan de entrenamiento por mes, armado con las máquinas de ${gymName}.`,
      '- Un plan de dieta por mes.',
      '- Mensajes con la IA para tus dudas, todos los días.',
      '',
      'Cómo empezar:',
      `1. Entrá a ${APP_URL}/register y creá tu cuenta con ESTE mismo mail. Si ya tenés cuenta de Forza AI, iniciá sesión con él.`,
      `2. Vas a ver tu invitación de ${gymName}: aceptala y listo.`,
      '',
      'También podés usar Forza AI desde la app del iPhone, con la misma cuenta.',
      '',
      `Si no conocés a ${gymName} o no esperabas este mensaje, ignoralo.`,
      '',
      'Equipo de Forza AI · soporte@forzaai.app',
    ].join('\n'),
  };
}

export interface PendingGroup {
  gymId: string;
  gymName: string;
  memberLimit: number;
  activeMembers: number;
  approvedWaiting: number;
  /** Cuántos más se pueden aprobar sin pasarse del cupo. */
  room: number;
  invites: Array<{ id: string; email: string; requestedAt: string }>;
}

export interface ApprovedRow {
  id: string;
  gymName: string;
  email: string;
  emailSent: boolean;
  decidedAt: string | null;
}

export async function listPendingGroups(): Promise<PendingGroup[]> {
  const pending = await prisma.gymInvite.findMany({
    where: { status: 'PENDING', gym: { status: 'ACTIVE' } },
    orderBy: { requestedAt: 'asc' },
    select: { id: true, email: true, requestedAt: true, gymId: true, gym: { select: { name: true, memberLimit: true } } },
  });
  if (pending.length === 0) return [];
  const gymIds = [...new Set(pending.map((p) => p.gymId))];
  const members = await prisma.gymMember.groupBy({ by: ['gymId'], where: { status: 'ACTIVE', gymId: { in: gymIds } }, _count: { _all: true } });
  const approved = await prisma.gymInvite.groupBy({ by: ['gymId'], where: { status: 'APPROVED', gymId: { in: gymIds } }, _count: { _all: true } });
  const mCount = new Map(members.map((m) => [m.gymId, m._count._all]));
  const aCount = new Map(approved.map((a) => [a.gymId, a._count._all]));

  const groups = new Map<string, PendingGroup>();
  for (const p of pending) {
    let g = groups.get(p.gymId);
    if (!g) {
      const activeMembers = mCount.get(p.gymId) ?? 0;
      const approvedWaiting = aCount.get(p.gymId) ?? 0;
      g = {
        gymId: p.gymId,
        gymName: p.gym.name,
        memberLimit: p.gym.memberLimit,
        activeMembers,
        approvedWaiting,
        room: approvableCount({ memberLimit: p.gym.memberLimit, activeMembers, approvedInvites: approvedWaiting }),
        invites: [],
      };
      groups.set(p.gymId, g);
    }
    g.invites.push({ id: p.id, email: p.email, requestedAt: p.requestedAt.toISOString() });
  }
  return [...groups.values()];
}

/** Invitaciones aprobadas cuyo mail no salió (para reenviarlas). */
export async function listUnsentApproved(): Promise<ApprovedRow[]> {
  const rows = await prisma.gymInvite.findMany({
    where: { status: 'APPROVED', emailSent: false },
    orderBy: { decidedAt: 'desc' },
    take: 100,
    select: { id: true, email: true, decidedAt: true, gym: { select: { name: true } } },
  });
  return rows.map((r) => ({ id: r.id, gymName: r.gym.name, email: r.email, emailSent: false, decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null }));
}

export interface ApproveResult {
  approved: number;
  /** No entraron en el cupo del gimnasio: siguen pendientes. */
  overCapacity: number;
  emailsSent: number;
  emailsFailed: number;
}

/**
 * Aprueba las invitaciones elegidas. Respeta el cupo de cada gimnasio (socios adentro más invitaciones ya
 * aprobadas): las que no entran quedan pendientes. A cada persona aprobada se le manda su mail.
 */
export async function approveInvites(ids: string[]): Promise<ApproveResult> {
  const result: ApproveResult = { approved: 0, overCapacity: 0, emailsSent: 0, emailsFailed: 0 };
  if (ids.length === 0) return result;
  const rows = await prisma.gymInvite.findMany({
    where: { id: { in: ids }, status: 'PENDING', gym: { status: 'ACTIVE' } },
    orderBy: { requestedAt: 'asc' },
    select: { id: true, email: true, gymId: true, gym: { select: { name: true, memberLimit: true } } },
  });
  const byGym = new Map<string, typeof rows>();
  for (const r of rows) byGym.set(r.gymId, [...(byGym.get(r.gymId) ?? []), r]);

  for (const [gymId, list] of byGym) {
    const first = list[0]!;
    const activeMembers = await prisma.gymMember.count({ where: { gymId, status: 'ACTIVE' } });
    const approvedInvites = await prisma.gymInvite.count({ where: { gymId, status: 'APPROVED' } });
    const room = approvableCount({ memberLimit: first.gym.memberLimit, activeMembers, approvedInvites });
    const take = list.slice(0, room);
    result.overCapacity += list.length - take.length;
    const mail = invitationEmail(first.gym.name);
    for (const inv of take) {
      const sent = await sendMail({ to: inv.email, subject: mail.subject, text: mail.text });
      await prisma.gymInvite.update({ where: { id: inv.id }, data: { status: 'APPROVED', decidedAt: new Date(), emailSent: sent } });
      result.approved += 1;
      if (sent) result.emailsSent += 1;
      else result.emailsFailed += 1;
    }
  }
  return result;
}

export async function rejectInvites(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const res = await prisma.gymInvite.updateMany({ where: { id: { in: ids }, status: 'PENDING' }, data: { status: 'REJECTED', decidedAt: new Date() } });
  return res.count;
}

/** Vuelve a mandar el mail de una invitación aprobada que no salió. */
export async function resendInvite(id: string): Promise<boolean> {
  const inv = await prisma.gymInvite.findFirst({ where: { id, status: 'APPROVED' }, select: { id: true, email: true, gym: { select: { name: true } } } });
  if (!inv) return false;
  const mail = invitationEmail(inv.gym.name);
  const sent = await sendMail({ to: inv.email, subject: mail.subject, text: mail.text });
  if (sent) await prisma.gymInvite.update({ where: { id: inv.id }, data: { emailSent: true } });
  return sent;
}
