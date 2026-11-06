import 'server-only';
import { prisma } from './db';
import { parseRoutineDays, type RoutineDay } from '@/features/gym/routines';

/**
 * Rutinas oficiales del gimnasio, vistas por sus socios. Siempre del gimnasio ACTIVO de quien mira (el `gymId`
 * sale de su membresía, nunca de la dirección), y solo las que el gimnasio dejó visibles.
 */

export interface MemberRoutine {
  id: string;
  title: string;
  description: string;
  level: string | null;
  days: RoutineDay[];
}

export async function countMemberRoutines(gymId: string): Promise<number> {
  return prisma.gymRoutine.count({ where: { gymId, active: true } });
}

export async function listMemberRoutines(gymId: string): Promise<MemberRoutine[]> {
  const rows = await prisma.gymRoutine.findMany({ where: { gymId, active: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }], take: 30 });
  return rows.map((r) => ({ id: r.id, title: r.title, description: r.description ?? '', level: r.level, days: parseRoutineDays(r.days) }));
}
