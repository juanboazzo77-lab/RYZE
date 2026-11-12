import 'server-only';
import { prisma } from './db';
import {
  addDays,
  bookingState,
  canCancel,
  startInstant,
  todayAR,
  upcomingOccurrences,
  weekdayOf,
  withinBookingWindow,
  type BookingState,
} from '@/features/gym/classes';
import { planAllowsClass, weeklyLimitReached } from '@/features/gym/plans';
import { bookingsInWeek, getMemberAccess } from './gym-plans';
import { sendUserMail } from './alerts';

/**
 * Reservas de clases, del lado del socio. Todo sale del gimnasio ACTIVO de quien reserva (el `gymId` viene de su
 * membresía, nunca de la dirección). Reglas: hasta 7 días hacia adelante, un lugar por clase y fecha, el cupo
 * no se pasa (se bloquea la clase mientras se cuenta) y se cancela hasta 2 horas antes.
 */

const dateOf = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

export interface ClassOccurrenceView {
  classId: string;
  date: string;
  startsAt: string;
  startTime: string;
  durationMin: number;
  name: string;
  description: string;
  instructor: string;
  capacity: number;
  booked: number;
  state: BookingState;
  /** El plan de pago del socio incluye esta clase (si no tiene plan asignado, todas están incluidas). */
  inPlan: boolean;
  /** El socio está en la lista de espera de esta clase. */
  onWaitlist: boolean;
  /** El gimnasio todavía no le asignó un plan (llegó por la página web): no puede reservar hasta que se lo asigne. */
  awaitingPlan: boolean;
}

/** Las clases de los próximos 7 días del gimnasio del socio, con cuántos lugares quedan y qué puede hacer él. */
export async function listClassesForMember(userId: string, gymId: string, now = new Date()): Promise<ClassOccurrenceView[]> {
  const classes = await prisma.gymClass.findMany({ where: { gymId, active: true }, orderBy: { startTime: 'asc' }, take: 100 });
  if (classes.length === 0) return [];
  const slots = classes.map((c) => ({ id: c.id, weekday: c.weekday, startTime: c.startTime, durationMin: c.durationMin, capacity: c.capacity, row: c }));
  const occ = upcomingOccurrences(slots, now);
  if (occ.length === 0) return [];
  const { plan, awaitingPlan: awaitingConfirm, trialEnded } = await getMemberAccess(userId, gymId);
  // Sin plan que lo habilite (el gimnasio todavía no se lo asignó, o terminó su prueba): no puede reservar.
  const awaitingPlan = awaitingConfirm || trialEnded;
  const today = todayAR(now);
  const waiting = await prisma.gymWaitlist.findMany({ where: { userId, classId: { in: classes.map((c) => c.id) }, date: { gte: dateOf(todayAR(now)) } }, select: { classId: true, date: true } }).catch(() => []);
  const waitSet = new Set(waiting.map((w) => `${w.classId}|${w.date.toISOString().slice(0, 10)}`));
  const bookings = await prisma.gymBooking.findMany({
    where: { classId: { in: classes.map((c) => c.id) }, status: 'BOOKED', date: { gte: dateOf(today), lte: dateOf(addDays(today, 7)) } },
    select: { classId: true, userId: true, date: true },
  });
  const count = new Map<string, number>();
  const mine = new Set<string>();
  for (const b of bookings) {
    const key = `${b.classId}|${b.date.toISOString().slice(0, 10)}`;
    count.set(key, (count.get(key) ?? 0) + 1);
    if (b.userId === userId) mine.add(key);
  }
  return occ.map((o) => {
    const key = `${o.slot.id}|${o.date}`;
    const booked = count.get(key) ?? 0;
    return {
      classId: o.slot.id,
      date: o.date,
      startsAt: o.startsAt.toISOString(),
      startTime: o.slot.startTime,
      durationMin: o.slot.durationMin,
      name: o.slot.row.name,
      description: o.slot.row.description ?? '',
      instructor: o.slot.row.instructor ?? '',
      capacity: o.slot.capacity,
      booked,
      state: bookingState({ now, startsAt: o.startsAt, capacity: o.slot.capacity, booked, mine: mine.has(key) }),
      inPlan: !awaitingPlan && planAllowsClass(plan, o.slot.row.name),
      onWaitlist: waitSet.has(key),
      awaitingPlan,
    };
  });
}

export type BookError = 'NOT_FOUND' | 'BAD_DATE' | 'STARTED' | 'FULL' | 'ALREADY' | 'NOT_IN_PLAN' | 'WEEK_LIMIT' | 'AWAITING_PLAN' | 'TRIAL_ENDED';

/** Reserva un lugar. Se bloquea la fila de la clase para que dos personas no se lleven el último lugar a la vez. */
export async function bookClass(userId: string, gymId: string, classId: string, dateISO: string, now = new Date()): Promise<'ok' | BookError> {
  if (!withinBookingWindow(dateISO, now)) return 'BAD_DATE';
  return prisma.$transaction(async (tx) => {
    const cls = await tx.gymClass.findFirst({ where: { id: classId, gymId, active: true } });
    if (!cls || cls.weekday !== weekdayOf(dateISO)) return 'NOT_FOUND' as const;
    if (startInstant(dateISO, cls.startTime).getTime() <= now.getTime()) return 'STARTED' as const;
    // El plan de pago que le asignó el gimnasio: a qué tipos de clase se puede anotar y cuántas reservas por semana.
    const { plan, awaitingPlan, trialEnded } = await getMemberAccess(userId, gymId);
    if (trialEnded) return 'TRIAL_ENDED' as const;
    if (awaitingPlan) return 'AWAITING_PLAN' as const;
    if (!planAllowsClass(plan, cls.name)) return 'NOT_IN_PLAN' as const;
    await tx.$queryRaw`SELECT id FROM gym_class WHERE id = ${classId}::uuid FOR UPDATE`;
    const date = dateOf(dateISO);
    const existing = await tx.gymBooking.findUnique({ where: { classId_userId_date: { classId, userId, date } } });
    if (existing?.status === 'BOOKED') return 'ALREADY' as const;
    if (plan && plan.weeklyLimit !== null && weeklyLimitReached(plan, await bookingsInWeek(userId, gymId, dateISO))) return 'WEEK_LIMIT' as const;
    const booked = await tx.gymBooking.count({ where: { classId, date, status: 'BOOKED' } });
    if (booked >= cls.capacity) return 'FULL' as const;
    if (existing) await tx.gymBooking.update({ where: { id: existing.id }, data: { status: 'BOOKED', cancelledAt: null } });
    else await tx.gymBooking.create({ data: { classId, userId, date } });
    return 'ok' as const;
  });
}

export type CancelError = 'NOT_FOUND' | 'TOO_LATE';

/** Cancela una reserva propia, hasta 2 horas antes de que empiece la clase. */
export async function cancelBooking(userId: string, gymId: string, classId: string, dateISO: string, now = new Date()): Promise<'ok' | CancelError> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return 'NOT_FOUND';
  const booking = await prisma.gymBooking.findFirst({
    where: { classId, userId, date: dateOf(dateISO), status: 'BOOKED', class: { gymId } },
    select: { id: true, class: { select: { startTime: true } } },
  });
  if (!booking) return 'NOT_FOUND';
  if (!canCancel(now, startInstant(dateISO, booking.class.startTime))) return 'TOO_LATE';
  await prisma.gymBooking.update({ where: { id: booking.id }, data: { status: 'CANCELLED', cancelledAt: now } });
  // Se liberó un lugar: entra el primero de la lista de espera.
  await promoteFromWaitlist(gymId, classId, dateISO, now).catch((e) => console.error('[lista-de-espera]', e instanceof Error ? e.message : e));
  return 'ok';
}

export type WaitError = 'NOT_FOUND' | 'BAD_DATE' | 'STARTED' | 'NOT_FULL' | 'ALREADY' | 'NOT_IN_PLAN' | 'WEEK_LIMIT' | 'AWAITING_PLAN' | 'TRIAL_ENDED';

/** El socio se anota en la lista de espera de una clase que está completa. Se aplican las mismas reglas que para reservar. */
export async function joinWaitlist(userId: string, gymId: string, classId: string, dateISO: string, now = new Date()): Promise<'ok' | WaitError> {
  if (!withinBookingWindow(dateISO, now)) return 'BAD_DATE';
  const cls = await prisma.gymClass.findFirst({ where: { id: classId, gymId, active: true } });
  if (!cls || cls.weekday !== weekdayOf(dateISO)) return 'NOT_FOUND';
  if (startInstant(dateISO, cls.startTime).getTime() <= now.getTime()) return 'STARTED';
  const date = dateOf(dateISO);
  const [mine, booked] = await Promise.all([
    prisma.gymBooking.findUnique({ where: { classId_userId_date: { classId, userId, date } } }),
    prisma.gymBooking.count({ where: { classId, date, status: 'BOOKED' } }),
  ]);
  if (mine?.status === 'BOOKED') return 'ALREADY';
  if (booked < cls.capacity) return 'NOT_FULL';
  const { plan, awaitingPlan, trialEnded } = await getMemberAccess(userId, gymId);
  if (trialEnded) return 'TRIAL_ENDED';
  if (awaitingPlan) return 'AWAITING_PLAN';
  if (!planAllowsClass(plan, cls.name)) return 'NOT_IN_PLAN';
  await prisma.gymWaitlist.upsert({ where: { classId_userId_date: { classId, userId, date } }, create: { classId, userId, date }, update: {} });
  return 'ok';
}

/** El socio sale de la lista de espera. */
export async function leaveWaitlist(userId: string, gymId: string, classId: string, dateISO: string): Promise<boolean> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return false;
  const res = await prisma.gymWaitlist.deleteMany({ where: { classId, userId, date: dateOf(dateISO), class: { gymId } } });
  return res.count > 0;
}

/** Pasa al primero de la lista que puede reservar (por su plan) y le avisa por mail. Los que ya no pueden se sacan de la lista. */
async function promoteFromWaitlist(gymId: string, classId: string, dateISO: string, now: Date): Promise<void> {
  const date = dateOf(dateISO);
  const queue = await prisma.gymWaitlist.findMany({ where: { classId, date }, orderBy: { createdAt: 'asc' }, take: 10, select: { userId: true } });
  for (const q of queue) {
    const res = await bookClass(q.userId, gymId, classId, dateISO, now);
    if (res === 'FULL') return;
    await prisma.gymWaitlist.deleteMany({ where: { classId, userId: q.userId, date } });
    if (res !== 'ok') continue;
    const [profile, cls] = await Promise.all([
      prisma.profile.findUnique({ where: { id: q.userId }, select: { email: true } }),
      prisma.gymClass.findUnique({ where: { id: classId }, select: { name: true, startTime: true } }),
    ]);
    if (profile?.email && cls) {
      await sendUserMail({
        to: profile.email,
        subject: `Se liberó un lugar: quedaste anotado en ${cls.name}`,
        text: `Se liberó un lugar en ${cls.name} del ${dateISO} a las ${cls.startTime} y quedaste anotado desde la lista de espera.\n\nSi no podés ir, cancelá tu reserva desde la app (Entrenamiento > Tu gimnasio > Clases) hasta 2 horas antes.`,
      });
    }
    return;
  }
}

/** La próxima clase que el socio tiene reservada (para el inicio). */
export async function nextBookingFor(userId: string, gymId: string, now = new Date()): Promise<{ name: string; date: string; startTime: string; startsAt: string } | null> {
  const today = todayAR(now);
  const rows = await prisma.gymBooking.findMany({
    where: { userId, status: 'BOOKED', date: { gte: dateOf(today) }, class: { gymId, active: true } },
    orderBy: { date: 'asc' },
    take: 8,
    select: { date: true, class: { select: { name: true, startTime: true } } },
  });
  const upcoming = rows
    .map((r) => {
      const date = r.date.toISOString().slice(0, 10);
      return { name: r.class.name, date, startTime: r.class.startTime, startsAt: startInstant(date, r.class.startTime) };
    })
    .filter((r) => r.startsAt.getTime() > now.getTime())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
  return upcoming ? { ...upcoming, startsAt: upcoming.startsAt.toISOString() } : null;
}
