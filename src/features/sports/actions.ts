'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { isoToUtcDate } from '@/lib/date';
import {
  addSportSchema,
  competitionInputSchema,
  idSchema,
  updateSportSchema,
} from './schema';

export interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

function refresh() {
  revalidatePath('/settings/sports');
  revalidatePath('/settings');
  revalidatePath('/dashboard');
}

export async function addSport(raw: unknown): Promise<Result<{ id: string }>> {
  const parsed = addSportSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const d = parsed.data;
  const { userId } = await requireUser();
  const db = forUser(userId);

  const count = await db.sportProfile.count();
  const s = await db.sportProfile.create({
    data: {
      userId,
      name: d.name,
      level: d.level ?? null,
      sessionsPerWeek: d.sessionsPerWeek,
      sessionDays: d.sessionDays,
      goal: d.goal || null,
      notes: d.notes || null,
      isPrimary: count === 0,
    },
    select: { id: true },
  });
  refresh();
  return { ok: true, data: { id: s.id } };
}

export async function updateSport(raw: unknown): Promise<Result> {
  const parsed = updateSportSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { id, ...d } = parsed.data;
  const { userId } = await requireUser();
  const db = forUser(userId);
  const upd = await db.sportProfile.updateMany({
    where: { id },
    data: {
      name: d.name,
      level: d.level ?? null,
      sessionsPerWeek: d.sessionsPerWeek,
      sessionDays: d.sessionDays,
      goal: d.goal || null,
      notes: d.notes || null,
    },
  });
  if (upd.count === 0) return { error: 'NOT_FOUND' };
  refresh();
  return { ok: true };
}

export async function deleteSport(raw: unknown): Promise<Result> {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const db = forUser(userId);
  await db.sportProfile.deleteMany({ where: { id: parsed.data.id } });
  // Si quedó otro deporte sin primario, marcar el más viejo.
  const rest = await db.sportProfile.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, isPrimary: true },
  });
  if (rest.length > 0 && !rest.some((s) => s.isPrimary)) {
    await db.sportProfile.updateMany({ where: { id: rest[0]!.id }, data: { isPrimary: true } });
  }
  refresh();
  return { ok: true };
}

export async function addCompetition(raw: unknown): Promise<Result<{ id: string }>> {
  const parsed = competitionInputSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const d = parsed.data;
  const { userId } = await requireUser();
  const db = forUser(userId);

  // Validar que el deporte, si se pasó, sea del usuario.
  let sportProfileId: string | null = null;
  if (d.sportProfileId) {
    const s = await db.sportProfile.findFirst({
      where: { id: d.sportProfileId },
      select: { id: true },
    });
    sportProfileId = s?.id ?? null;
  }

  const c = await db.competition.create({
    data: {
      userId,
      sportProfileId,
      name: d.name,
      date: isoToUtcDate(d.date),
      priority: d.priority,
      notes: d.notes || null,
    },
    select: { id: true },
  });
  refresh();
  return { ok: true, data: { id: c.id } };
}

export async function deleteCompetition(raw: unknown): Promise<Result> {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  await forUser(userId).competition.deleteMany({ where: { id: parsed.data.id } });
  refresh();
  return { ok: true };
}
