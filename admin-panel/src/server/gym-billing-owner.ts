import 'server-only';
import { prisma } from './db';
import { amountFor, dueDateOf, isOverdue, periodOf, todayDate } from './gym-billing';
import { asCurrency, zeroMoney, type Currency, type Money } from '@/features/gym/money';

/**
 * Lo que el gimnasio le paga a FORZA AI, visto por su dueño: cuántos socios tiene activos, a cuánto sale cada uno,
 * lo que debe y cómo pagar (transferencia). Solo lectura: los cobros los arma y marca el administrador.
 */

export interface OwnerBillingRow {
  period: string;
  members: number;
  pricePerMember: number;
  amount: number;
  currency: Currency;
  dueDate: string;
  status: 'PENDING' | 'PAID';
  overdue: boolean;
}

export interface OwnerBilling {
  currency: Currency;
  pricePerMember: number;
  activeMembers: number;
  /** Mes en curso y lo que se estima cobrar si no hay un cobro armado todavía. */
  currentPeriod: string;
  estimate: number;
  estimateDueDate: string;
  /** Todo lo pendiente (vencido o no), por moneda. */
  pending: Money;
  rows: OwnerBillingRow[];
}

export async function getOwnerBilling(ownerUserId: string, gymId: string, now = new Date()): Promise<OwnerBilling | null> {
  const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerUserId }, select: { currency: true, pricePerMember: true } });
  if (!gym) return null;
  const currency = asCurrency(gym.currency);
  const pricePerMember = Number(gym.pricePerMember);
  const activeMembers = await prisma.gymMember.count({ where: { gymId, status: 'ACTIVE' } });
  const payments = await prisma.gymPayment.findMany({ where: { gymId }, orderBy: { period: 'desc' }, take: 6 });
  const today = todayDate(now);
  const rows: OwnerBillingRow[] = payments.map((p) => ({
    period: p.period,
    members: p.members,
    pricePerMember: Number(p.pricePerMember),
    amount: Number(p.amount),
    currency: asCurrency(p.currency),
    dueDate: p.dueDate.toISOString().slice(0, 10),
    status: p.status === 'PAID' ? 'PAID' : 'PENDING',
    overdue: isOverdue(p.status, p.dueDate, today),
  }));
  const pending = zeroMoney();
  for (const r of rows) if (r.status === 'PENDING') pending[r.currency] += r.amount;
  const currentPeriod = periodOf(now);
  return {
    currency,
    pricePerMember,
    activeMembers,
    currentPeriod,
    estimate: amountFor(activeMembers, pricePerMember),
    estimateDueDate: dueDateOf(currentPeriod).toISOString().slice(0, 10),
    pending,
    rows,
  };
}
