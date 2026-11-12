import 'server-only';
import { prisma } from './db';
import { asCurrency, type Currency } from '@/features/gym/money';
import { countByMonth, fillPercent, lastMonths, occurrencesBetween, sumByMonth } from '@/features/gym/reports';

/**
 * Reportes del gimnasio para su dueño: altas y bajas de clientes con Forza AI, plata cobrada de cuotas, ocupación de
 * las clases y clientes por plan. Todo sobre el gimnasio del que la cuenta es dueña.
 */

const MONTHS = 6;
const WEEKS_FOR_CLASSES = 4;

export interface GymReport {
  currency: Currency;
  months: string[];
  /** Clientes que se conectaron al gimnasio por mes. */
  joined: number[];
  /** Clientes que dejaron de estar conectados por mes. */
  left: number[];
  /** Clientes activos hoy con Forza AI. */
  activeNow: number;
  /** Lo cobrado por mes según las cuotas que anotó el dueño (solo los pagos con monto). */
  collected: number[];
  classes: Array<{ name: string; weekday: number; startTime: string; capacity: number; booked: number; fill: number }>;
  plans: Array<{ name: string; clients: number; price: number | null; monthly: number | null }>;
  noPlan: number;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export async function getGymReport(ownerUserId: string, gymId: string, now = new Date()): Promise<GymReport | null> {
  const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerUserId }, select: { id: true, currency: true } });
  if (!gym) return null;
  const months = lastMonths(MONTHS, now);
  const since = new Date(`${months[0]}-01T00:00:00Z`);
  const today = isoDay(now);
  const from = isoDay(new Date(now.getTime() - (WEEKS_FOR_CLASSES * 7 - 1) * 24 * 60 * 60 * 1000));

  const [members, activeNow, payments, classes, bookings, plans, noPlan] = await Promise.all([
    prisma.gymMember.findMany({ where: { gymId, OR: [{ joinedAt: { gte: since } }, { endedAt: { gte: since } }] }, select: { joinedAt: true, endedAt: true } }),
    prisma.gymMember.count({ where: { gymId, status: 'ACTIVE' } }),
    prisma.gymClientPayment.findMany({ where: { client: { gymId }, paidOn: { gte: since }, amount: { not: null } }, select: { paidOn: true, amount: true } }),
    prisma.gymClass.findMany({ where: { gymId, active: true }, select: { id: true, name: true, weekday: true, startTime: true, capacity: true } }),
    prisma.gymBooking.groupBy({ by: ['classId'], where: { status: 'BOOKED', class: { gymId }, date: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${today}T00:00:00Z`) } }, _count: { _all: true } }),
    prisma.gymPlan.findMany({ where: { gymId, active: true }, orderBy: { createdAt: 'asc' }, include: { _count: { select: { clients: { where: { active: true } } } } } }),
    prisma.gymClient.count({ where: { gymId, active: true, planId: null } }),
  ]);

  const bookedBy = new Map(bookings.map((b) => [b.classId, b._count._all]));
  return {
    currency: asCurrency(gym.currency),
    months,
    joined: countByMonth(members.map((m) => m.joinedAt), months),
    left: countByMonth(members.map((m) => m.endedAt), months),
    activeNow,
    collected: sumByMonth(payments.map((p) => ({ date: p.paidOn, amount: Number(p.amount) })), months),
    classes: classes
      .map((c) => {
        const booked = bookedBy.get(c.id) ?? 0;
        return { name: c.name, weekday: c.weekday, startTime: c.startTime, capacity: c.capacity, booked, fill: fillPercent(booked, c.capacity, occurrencesBetween(c.weekday, from, today)) };
      })
      .sort((a, b) => b.fill - a.fill),
    plans: plans.map((p) => {
      const price = p.price === null ? null : Number(p.price);
      return { name: p.name, clients: p._count.clients, price, monthly: price === null ? null : price * p._count.clients };
    }),
    noPlan,
  };
}
