import 'server-only';
import { DateTime } from 'luxon';
import type { Profile } from '@prisma/client';
import { forUser } from '@/server/user-db';
import { localTodayISO } from '@/lib/date';
import { consistencyView, type ConsistencyView, type YearGridView } from './view';

export type { ConsistencyView, YearGridView };

/** Los días (en la zona horaria de la persona) en que terminó al menos un entrenamiento. */
export async function getConsistency(profile: Profile): Promise<ConsistencyView> {
  const db = forUser(profile.id);
  const todayISO = localTodayISO(profile.timezone);
  const rows = await db.workout.findMany({
    where: { status: 'COMPLETED', finishedAt: { not: null } },
    select: { finishedAt: true },
  });

  const trained = new Set<string>();
  for (const w of rows) {
    if (!w.finishedAt) continue;
    const iso = DateTime.fromJSDate(w.finishedAt).setZone(profile.timezone).toISODate();
    if (iso) trained.add(iso);
  }

  return consistencyView(trained, todayISO, profile.weekStart);
}
