import 'server-only';
import { prisma } from './db';
import { requestInvites, type RequestInvitesResult } from './owner';
import { todayArgentina } from './gym-fees';
import { daysBetween, feeRank, feeStatus, nextPaidUntil, isISODate, type ClientLine, type FeeStatus } from '@/features/gym/fees';

/**
 * Gestión de clientes de un gimnasio: la lista de sus clientes (con o sin Forza AI) y el control de sus cuotas.
 * Todo se hace sobre el gimnasio del que la cuenta es dueña (se vuelve a comprobar en cada función). Cliente
 * global a propósito: son datos del gimnasio, no de un usuario de la app.
 */

export const MAX_CLIENTS_PER_ADD = 500;

const isoOf = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);
const dateOf = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

/** Estado de Forza AI de un cliente, según su mail. */
export type ForzaState = 'NONE' | 'NO_EMAIL' | 'REQUESTED' | 'PAID' | 'INVITED' | 'MEMBER' | 'LAPSED';

export interface ClientRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  feeAmount: number | null;
  paidUntil: string | null;
  status: FeeStatus;
  /** Días que faltan para el vencimiento (negativo si ya venció). */
  daysLeft: number | null;
  lastPaidOn: string | null;
  forza: ForzaState;
}

async function ownedGym(ownerUserId: string, gymId: string) {
  return prisma.gym.findFirst({
    where: { id: gymId, ownerUserId, status: { in: ['ACTIVE', 'SUSPENDED', 'PENDING'] } },
    select: { id: true, name: true, status: true },
  });
}

export async function listClients(ownerUserId: string, gymId: string, today = todayArgentina()): Promise<ClientRow[] | null> {
  if (!(await ownedGym(ownerUserId, gymId))) return null;
  const clients = await prisma.gymClient.findMany({ where: { gymId, active: true }, orderBy: { name: 'asc' }, take: 2000 });
  if (clients.length === 0) return [];
  const last = await prisma.gymClientPayment.groupBy({ by: ['clientId'], where: { clientId: { in: clients.map((c) => c.id) } }, _max: { paidOn: true } });
  const lastBy = new Map(last.map((l) => [l.clientId, l._max.paidOn]));

  // Forza AI por mail: pedidos del gimnasio y socios (activos o sin acceso por cuota vencida).
  const emails = [...new Set(clients.map((c) => c.email).filter((e): e is string => !!e))];
  const invites = emails.length ? await prisma.gymInvite.findMany({ where: { gymId, email: { in: emails } }, select: { email: true, status: true, paidAt: true } }) : [];
  const members = emails.length
    ? await prisma.gymMember.findMany({
        where: { gymId, status: { in: ['ACTIVE', 'LAPSED'] }, user: { email: { in: emails, mode: 'insensitive' } } },
        select: { status: true, user: { select: { email: true } } },
      })
    : [];
  const inviteBy = new Map(invites.map((i) => [i.email, i]));
  const memberBy = new Map(members.map((m) => [m.user.email.toLowerCase(), m.status]));

  const forzaOf = (email: string | null): ForzaState => {
    if (!email) return 'NO_EMAIL';
    const m = memberBy.get(email);
    if (m === 'ACTIVE') return 'MEMBER';
    if (m === 'LAPSED') return 'LAPSED';
    const i = inviteBy.get(email);
    if (!i) return 'NONE';
    if (i.status === 'APPROVED') return 'INVITED';
    if (i.status === 'PENDING') return i.paidAt ? 'PAID' : 'REQUESTED';
    return 'NONE';
  };

  const rows = clients.map((c) => {
    const paidUntil = isoOf(c.paidUntil);
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      feeAmount: c.feeAmount === null ? null : Number(c.feeAmount),
      paidUntil,
      status: feeStatus(paidUntil, today),
      daysLeft: paidUntil ? daysBetween(today, paidUntil) : null,
      lastPaidOn: isoOf(lastBy.get(c.id) ?? null),
      forza: forzaOf(c.email),
    };
  });
  // Primero lo que hay que cobrar ya; dentro de cada estado, por nombre.
  return rows.sort((a, b) => feeRank(a.status) - feeRank(b.status) || a.name.localeCompare(b.name, 'es'));
}

export interface ClientCounts {
  total: number;
  dueToday: number;
  soon: number;
  overdue: number;
  lapsed: number;
}

export function countClients(rows: ClientRow[]): ClientCounts {
  const count = (s: FeeStatus) => rows.filter((r) => r.status === s).length;
  return { total: rows.length, dueToday: count('DUE_TODAY'), soon: count('SOON'), overdue: count('OVERDUE'), lapsed: count('LAPSED') };
}

/** Carga clientes nuevos (los que ya están por mail no se repiten). */
export async function addClients(
  ownerUserId: string,
  gymId: string,
  lines: ClientLine[],
): Promise<{ added: number; skipped: number } | { error: 'NOT_OWNER' | 'EMPTY' | 'TOO_MANY' }> {
  if (!(await ownedGym(ownerUserId, gymId))) return { error: 'NOT_OWNER' };
  if (lines.length === 0) return { error: 'EMPTY' };
  if (lines.length > MAX_CLIENTS_PER_ADD) return { error: 'TOO_MANY' };
  const emails = lines.map((l) => l.email).filter((e): e is string => !!e);
  const existing = emails.length ? await prisma.gymClient.findMany({ where: { gymId, active: true, email: { in: emails } }, select: { email: true } }) : [];
  const have = new Set(existing.map((e) => e.email));
  const seen = new Set<string>();
  const data = [];
  let skipped = 0;
  for (const l of lines) {
    if (l.email && (have.has(l.email) || seen.has(l.email))) {
      skipped += 1;
      continue;
    }
    if (l.email) seen.add(l.email);
    data.push({
      gymId,
      name: l.name,
      email: l.email,
      phone: l.phone,
      feeAmount: l.fee !== null && Number.isFinite(l.fee) ? l.fee : null,
      paidUntil: l.paidUntil && isISODate(l.paidUntil) ? dateOf(l.paidUntil) : null,
    });
  }
  if (data.length > 0) await prisma.gymClient.createMany({ data });
  return { added: data.length, skipped };
}

/**
 * Anota que el cliente pagó. El vencimiento corre `months` meses (desde el vencimiento anterior si pagó a
 * tiempo, desde el día del pago si pagó tarde o es la primera vez). Si tiene Forza AI y lo había perdido por
 * la cuota vencida, lo recupera.
 */
export async function markClientPaid(
  ownerUserId: string,
  clientId: string,
  opts: { paidOn?: string; amount?: number | null; months?: number; note?: string } = {},
): Promise<{ ok: true; paidUntil: string } | { error: 'NOT_FOUND' | 'INVALID' }> {
  const months = Math.min(24, Math.max(1, Math.round(opts.months ?? 1)));
  const paidOn = opts.paidOn ?? todayArgentina();
  if (!isISODate(paidOn)) return { error: 'INVALID' };
  const client = await prisma.gymClient.findFirst({ where: { id: clientId, active: true, gym: { ownerUserId } }, select: { id: true, gymId: true, email: true, paidUntil: true, feeAmount: true } });
  if (!client) return { error: 'NOT_FOUND' };
  const until = nextPaidUntil(isoOf(client.paidUntil), paidOn, months);
  const amount = opts.amount !== undefined && opts.amount !== null && Number.isFinite(opts.amount) ? opts.amount : client.feeAmount === null ? null : Number(client.feeAmount) * months;
  await prisma.$transaction(async (tx) => {
    await tx.gymClientPayment.create({ data: { clientId, paidOn: dateOf(paidOn), amount, months, note: opts.note?.trim().slice(0, 300) || null } });
    await tx.gymClient.update({ where: { id: clientId }, data: { paidUntil: dateOf(until) } });
    if (client.email) {
      await tx.gymMember.updateMany({
        where: { gymId: client.gymId, status: 'LAPSED', user: { email: { equals: client.email, mode: 'insensitive' } } },
        data: { status: 'ACTIVE', endedAt: null },
      });
    }
  });
  return { ok: true, paidUntil: until };
}

/** Cambia datos de un cliente (todo opcional). */
export async function updateClient(
  ownerUserId: string,
  clientId: string,
  patch: { name?: string; email?: string | null; phone?: string | null; feeAmount?: number | null; paidUntil?: string | null },
): Promise<boolean> {
  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const n = patch.name.trim().slice(0, 120);
    if (n.length < 2) return false;
    data.name = n;
  }
  if (patch.email !== undefined) data.email = patch.email ? patch.email.trim().toLowerCase().slice(0, 200) : null;
  if (patch.phone !== undefined) data.phone = patch.phone ? patch.phone.trim().slice(0, 40) : null;
  if (patch.feeAmount !== undefined) data.feeAmount = patch.feeAmount !== null && Number.isFinite(patch.feeAmount) ? patch.feeAmount : null;
  if (patch.paidUntil !== undefined) {
    if (patch.paidUntil && !isISODate(patch.paidUntil)) return false;
    data.paidUntil = patch.paidUntil ? dateOf(patch.paidUntil) : null;
  }
  const res = await prisma.gymClient.updateMany({ where: { id: clientId, active: true, gym: { ownerUserId } }, data });
  return res.count > 0;
}

export async function removeClient(ownerUserId: string, clientId: string): Promise<boolean> {
  const res = await prisma.gymClient.updateMany({ where: { id: clientId, active: true, gym: { ownerUserId } }, data: { active: false } });
  return res.count > 0;
}

/** Pide Forza AI para estos clientes (por su mail): entra al mismo circuito de altas (pago y aprobación). */
export async function requestForzaFor(
  ownerUserId: string,
  gymId: string,
  clientIds: string[],
): Promise<RequestInvitesResult | { error: 'NOT_OWNER' | 'NOT_ACTIVE' | 'EMPTY' | 'TOO_MANY' | 'NO_EMAIL' }> {
  if (!(await ownedGym(ownerUserId, gymId))) return { error: 'NOT_OWNER' };
  const rows = await prisma.gymClient.findMany({ where: { id: { in: clientIds }, gymId, active: true }, select: { email: true } });
  const emails = rows.map((r) => r.email).filter((e): e is string => !!e);
  if (emails.length === 0) return { error: 'NO_EMAIL' };
  return requestInvites(ownerUserId, gymId, emails.join('\n'));
}
