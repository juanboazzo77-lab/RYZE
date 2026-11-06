import 'server-only';
import { prisma } from './db';
import { asCurrency, priceLimit, zeroMoney, type Currency, type Money } from '@/features/gym/money';

/**
 * Cobros a gimnasios. Un registro por gimnasio y mes: socios que entraron con su código × precio por socio.
 * Se arman solos al abrir el panel de cobros (para los gimnasios activos con al menos un socio) y mientras
 * están pendientes siguen la cantidad de socios; al marcarlos pagados quedan fijos. Vencen el día 10 del mes.
 * El cobro en sí se hace por fuera (transferencia): acá sólo se lleva la cuenta.
 */

export const DUE_DAY = 10;

/** Mes actual "2026-11" en horario de Argentina (UTC-3). */
export function periodOf(now: Date = new Date()): string {
  const ar = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return `${ar.getUTCFullYear()}-${String(ar.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Fecha de vencimiento (día 10 del mes que se cobra). */
export function dueDateOf(period: string): Date {
  const [y, m] = period.split('-').map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, DUE_DAY));
}

/** Hoy como fecha sin hora (Argentina), para comparar con el vencimiento. */
export function todayDate(now: Date = new Date()): Date {
  const ar = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), ar.getUTCDate()));
}

export const roundMoney = (n: number) => Math.round(n * 100) / 100;

export function amountFor(members: number, pricePerMember: number): number {
  return roundMoney(Math.max(0, members) * Math.max(0, pricePerMember));
}

export function isOverdue(status: string, dueDate: Date, today: Date = todayDate()): boolean {
  return status === 'PENDING' && dueDate.getTime() < today.getTime();
}

/** Crea o actualiza el cobro del mes de cada gimnasio activo. Idempotente. */
export async function ensureCurrentPayments(): Promise<void> {
  const period = periodOf();
  const gyms = await prisma.gym.findMany({ where: { status: 'ACTIVE' }, select: { id: true, pricePerMember: true, currency: true } });
  if (gyms.length === 0) return;
  const counts = await prisma.gymMember.groupBy({
    by: ['gymId'],
    where: { status: 'ACTIVE', gymId: { in: gyms.map((g) => g.id) } },
    _count: { _all: true },
  });
  const byGym = new Map(counts.map((c) => [c.gymId, c._count._all]));
  const existing = await prisma.gymPayment.findMany({ where: { period, gymId: { in: gyms.map((g) => g.id) } } });
  const existingByGym = new Map(existing.map((p) => [p.gymId, p]));

  for (const g of gyms) {
    const members = byGym.get(g.id) ?? 0;
    const price = Number(g.pricePerMember);
    const current = existingByGym.get(g.id);
    if (!current) {
      if (members === 0) continue;
      try {
        await prisma.gymPayment.create({
          data: {
            gymId: g.id,
            period,
            members,
            pricePerMember: price,
            amount: amountFor(members, price),
            currency: asCurrency(g.currency),
            dueDate: dueDateOf(period),
          },
        });
      } catch {
        /* dos aperturas a la vez: el otro lo creó */
      }
    } else if (current.status === 'PENDING') {
      await prisma.gymPayment.update({
        where: { id: current.id },
        data: { members, pricePerMember: price, amount: amountFor(members, price), currency: asCurrency(g.currency) },
      });
    }
  }
}

export interface PaymentRow {
  id: string;
  gymId: string;
  gymName: string;
  period: string;
  members: number;
  pricePerMember: number;
  amount: number;
  currency: Currency;
  dueDate: string;
  status: 'PENDING' | 'PAID';
  overdue: boolean;
  paidAt: string | null;
  note: string | null;
}

export async function listPayments(take = 200): Promise<PaymentRow[]> {
  const rows = await prisma.gymPayment.findMany({
    orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
    take,
    include: { gym: { select: { name: true } } },
  });
  const today = todayDate();
  const out = rows.map((r) => ({
    id: r.id,
    gymId: r.gymId,
    gymName: r.gym.name,
    period: r.period,
    members: r.members,
    pricePerMember: Number(r.pricePerMember),
    amount: Number(r.amount),
    currency: asCurrency(r.currency),
    dueDate: r.dueDate.toISOString().slice(0, 10),
    status: (r.status === 'PAID' ? 'PAID' : 'PENDING') as 'PENDING' | 'PAID',
    overdue: isOverdue(r.status, r.dueDate, today),
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
    note: r.note,
  }));
  // Vencidos primero, después pendientes, después pagados.
  const rank = (p: PaymentRow) => (p.overdue ? 0 : p.status === 'PENDING' ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b));
}

export interface BillingTotals {
  overdueCount: number;
  /** Lo vencido, lo pendiente y lo cobrado este mes, cada uno por moneda (nunca se suman pesos con dólares). */
  overdue: Money;
  pending: Money;
  collectedThisMonth: Money;
}

export function totalsOf(rows: PaymentRow[], now: Date = new Date()): BillingTotals {
  const period = periodOf(now);
  const monthStart = new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5)) - 1, 1));
  let overdueCount = 0;
  const overdue = zeroMoney();
  const pending = zeroMoney();
  const collected = zeroMoney();
  for (const r of rows) {
    if (r.status === 'PENDING') {
      pending[r.currency] += r.amount;
      if (r.overdue) {
        overdueCount += 1;
        overdue[r.currency] += r.amount;
      }
    } else if (r.paidAt && new Date(r.paidAt) >= monthStart) {
      collected[r.currency] += r.amount;
    }
  }
  const round = (m: Money): Money => ({ ARS: roundMoney(m.ARS), USD: roundMoney(m.USD) });
  return { overdueCount, overdue: round(overdue), pending: round(pending), collectedThisMonth: round(collected) };
}

export async function setPaymentPaid(id: string, paid: boolean, note?: string): Promise<boolean> {
  const res = await prisma.gymPayment.updateMany({
    where: { id },
    data: paid
      ? { status: 'PAID', paidAt: new Date(), note: note?.trim().slice(0, 300) || null }
      : { status: 'PENDING', paidAt: null },
  });
  return res.count > 0;
}

/** El administrador fija el precio por socio y la moneda de un gimnasio. Los cobros pendientes lo toman la próxima vez. */
export async function setGymPrice(gymId: string, pricePerMember: number, currency: Currency): Promise<boolean> {
  const cur = asCurrency(currency);
  if (!Number.isFinite(pricePerMember) || pricePerMember < 0 || pricePerMember > priceLimit(cur)) return false;
  const res = await prisma.gym.updateMany({ where: { id: gymId }, data: { pricePerMember: roundMoney(pricePerMember), currency: cur } });
  return res.count > 0;
}
