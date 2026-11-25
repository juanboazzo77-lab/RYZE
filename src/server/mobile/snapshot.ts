import type { PrismaClient } from '@prisma/client';
import type { AppData } from '@/lib/sync/data';
import { PROTOCOL_VERSION, type Snapshot } from '@/lib/sync/protocol';

/** Algo más de un año de registros diarios. */
const MAX_WEIGHTS = 400;

export type SnapshotDb = Pick<PrismaClient, 'weightEntry' | 'profile'>;

/**
 * La foto de los datos que la app guarda para mostrarlos sin conexión. `db` tiene que venir acotada a la persona
 * (`forUser`); el perfil se pide por su propio id. Se elige campo por campo: nada de la base viaja por las dudas.
 */
export async function buildSnapshot(db: SnapshotDb, userId: string, now: Date): Promise<Snapshot> {
  const [profile, weights] = await Promise.all([
    db.profile.findUnique({
      where: { id: userId },
      select: { name: true, email: true, timezone: true, unitSystem: true, weekStart: true, locale: true },
    }),
    db.weightEntry.findMany({
      orderBy: { date: 'desc' },
      take: MAX_WEIGHTS,
      select: { date: true, weightKg: true, note: true },
    }),
  ]);
  if (!profile) throw new Error('SIN_PERFIL');

  const data: AppData = {
    profile,
    weights: weights.map((w) => ({ date: w.date.toISOString().slice(0, 10), weightKg: w.weightKg, note: w.note })),
  };
  return { protocol: PROTOCOL_VERSION, takenAt: now.toISOString(), data };
}
