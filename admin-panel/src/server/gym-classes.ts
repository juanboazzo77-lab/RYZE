import 'server-only';
import { prisma } from './db';
import { addDays, cleanClass, MAX_CLASSES_PER_GYM, todayAR, upcomingOccurrences } from '@/features/gym/classes';

/** Clases con reserva, del lado del dueño: armar la grilla semanal y ver quién reservó. Cada función comprueba que la cuenta sea la dueña. */

const dateOf = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

export interface ClassRow {
  id: string;
  name: string;
  description: string;
  instructor: string;
  weekday: number;
  startTime: string;
  durationMin: number;
  capacity: number;
  active: boolean;
}

export async function listClasses(ownerUserId: string, gymId: string): Promise<ClassRow[] | null> {
  const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerUserId }, select: { id: true } });
  if (!gym) return null;
  const rows = await prisma.gymClass.findMany({ where: { gymId }, orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }], take: MAX_CLASSES_PER_GYM });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    instructor: r.instructor ?? '',
    weekday: r.weekday,
    startTime: r.startTime,
    durationMin: r.durationMin,
    capacity: r.capacity,
    active: r.active,
  }));
}

/** Crea la clase en cada día de la semana elegido (una fila por día). */
export async function createClasses(
  ownerUserId: string,
  gymId: string,
  raw: { name?: unknown; description?: unknown; instructor?: unknown; weekdays?: unknown; startTime?: unknown; durationMin?: unknown; capacity?: unknown },
): Promise<{ ok: true; created: number } | { error: 'NOT_OWNER' | 'NAME' | 'WEEKDAYS' | 'TIME' | 'DURATION' | 'CAPACITY' | 'TOO_MANY' }> {
  const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerUserId, status: 'ACTIVE' }, select: { id: true } });
  if (!gym) return { error: 'NOT_OWNER' };
  const clean = cleanClass(raw);
  if ('error' in clean) return { error: clean.error };
  const total = await prisma.gymClass.count({ where: { gymId } });
  if (total + clean.weekdays.length > MAX_CLASSES_PER_GYM) return { error: 'TOO_MANY' };
  await prisma.gymClass.createMany({
    data: clean.weekdays.map((weekday) => ({
      gymId,
      name: clean.name,
      description: clean.description || null,
      instructor: clean.instructor || null,
      weekday,
      startTime: clean.startTime,
      durationMin: clean.durationMin,
      capacity: clean.capacity,
    })),
  });
  return { ok: true, created: clean.weekdays.length };
}

export async function setClassActive(ownerUserId: string, id: string, active: boolean): Promise<boolean> {
  const res = await prisma.gymClass.updateMany({ where: { id, gym: { ownerUserId } }, data: { active } });
  return res.count > 0;
}

/** Borra la clase y sus reservas. */
export async function deleteClass(ownerUserId: string, id: string): Promise<boolean> {
  const res = await prisma.gymClass.deleteMany({ where: { id, gym: { ownerUserId } } });
  return res.count > 0;
}

export interface UpcomingClass {
  classId: string;
  date: string;
  startTime: string;
  name: string;
  capacity: number;
  /** Nombres de quienes reservaron. */
  attendees: string[];
}

/** Las clases de los próximos 7 días con quiénes reservaron. */
export async function upcomingForOwner(ownerUserId: string, gymId: string, now = new Date()): Promise<UpcomingClass[] | null> {
  const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerUserId }, select: { id: true } });
  if (!gym) return null;
  const classes = await prisma.gymClass.findMany({ where: { gymId, active: true }, take: MAX_CLASSES_PER_GYM });
  if (classes.length === 0) return [];
  const slots = classes.map((c) => ({ id: c.id, weekday: c.weekday, startTime: c.startTime, durationMin: c.durationMin, capacity: c.capacity, name: c.name }));
  const occ = upcomingOccurrences(slots, now);
  const today = todayAR(now);
  const bookings = await prisma.gymBooking.findMany({
    where: { classId: { in: classes.map((c) => c.id) }, status: 'BOOKED', date: { gte: dateOf(today), lte: dateOf(addDays(today, 7)) } },
    select: { classId: true, date: true, user: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const byKey = new Map<string, string[]>();
  for (const b of bookings) {
    const key = `${b.classId}|${b.date.toISOString().slice(0, 10)}`;
    byKey.set(key, [...(byKey.get(key) ?? []), b.user.name?.trim() || 'Socio']);
  }
  return occ.map((o) => ({
    classId: o.slot.id,
    date: o.date,
    startTime: o.slot.startTime,
    name: o.slot.name,
    capacity: o.slot.capacity,
    attendees: byKey.get(`${o.slot.id}|${o.date}`) ?? [],
  }));
}
