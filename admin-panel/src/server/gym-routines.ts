import 'server-only';
import { prisma } from './db';
import { cleanRoutine, MAX_ROUTINES_PER_GYM, parseRoutineDays, type RoutineDay } from '@/features/gym/routines';

/** Rutinas oficiales: las arma el dueño (o su profe) y las ven los socios en la app. Cada función comprueba que la cuenta sea la dueña. */

export interface RoutineRow {
  id: string;
  title: string;
  description: string;
  level: string | null;
  days: RoutineDay[];
  active: boolean;
  updatedAt: string;
}

const toRow = (r: { id: string; title: string; description: string | null; level: string | null; days: unknown; active: boolean; updatedAt: Date }): RoutineRow => ({
  id: r.id,
  title: r.title,
  description: r.description ?? '',
  level: r.level,
  days: parseRoutineDays(r.days),
  active: r.active,
  updatedAt: r.updatedAt.toISOString(),
});

export async function listRoutines(ownerUserId: string, gymId: string): Promise<RoutineRow[] | null> {
  const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerUserId }, select: { id: true } });
  if (!gym) return null;
  const rows = await prisma.gymRoutine.findMany({ where: { gymId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }], take: MAX_ROUTINES_PER_GYM });
  return rows.map(toRow);
}

export async function getRoutine(ownerUserId: string, id: string): Promise<RoutineRow | null> {
  const r = await prisma.gymRoutine.findFirst({ where: { id, gym: { ownerUserId } } });
  return r ? toRow(r) : null;
}

/** Crea (id = null) o actualiza una rutina. La limpia antes de guardar. */
export async function saveRoutine(
  ownerUserId: string,
  gymId: string,
  id: string | null,
  raw: { title?: unknown; description?: unknown; level?: unknown; days?: unknown },
): Promise<{ ok: true; id: string } | { error: 'INVALID' | 'NOT_OWNER' | 'TOO_MANY' | 'NOT_FOUND' }> {
  const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerUserId }, select: { id: true } });
  if (!gym) return { error: 'NOT_OWNER' };
  const clean = cleanRoutine(raw);
  if (!clean) return { error: 'INVALID' };
  const data = { title: clean.title, description: clean.description || null, level: clean.level, days: clean.days as unknown as object };
  if (id) {
    const res = await prisma.gymRoutine.updateMany({ where: { id, gymId }, data });
    return res.count > 0 ? { ok: true, id } : { error: 'NOT_FOUND' };
  }
  if ((await prisma.gymRoutine.count({ where: { gymId } })) >= MAX_ROUTINES_PER_GYM) return { error: 'TOO_MANY' };
  const created = await prisma.gymRoutine.create({ data: { gymId, ...data }, select: { id: true } });
  return { ok: true, id: created.id };
}

export async function setRoutineActive(ownerUserId: string, id: string, active: boolean): Promise<boolean> {
  const res = await prisma.gymRoutine.updateMany({ where: { id, gym: { ownerUserId } }, data: { active } });
  return res.count > 0;
}

export async function deleteRoutine(ownerUserId: string, id: string): Promise<boolean> {
  const res = await prisma.gymRoutine.deleteMany({ where: { id, gym: { ownerUserId } } });
  return res.count > 0;
}
