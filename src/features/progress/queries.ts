import 'server-only';
import type { Profile } from '@prisma/client';
import { forUser } from '@/server/user-db';
import { localTodayISO } from '@/lib/date';
import type { WeightPoint } from '@/lib/progress/weight';
import { weightSummary, type WeightSummary } from '@/lib/progress/summary';

export interface WeightEntryDTO {
  id: string;
  date: string; // yyyy-mm-dd
  weightKg: number;
  note: string | null;
}

export interface WeightPageData extends WeightSummary {
  todayISO: string;
  rangeDays: number;
  entries: WeightEntryDTO[]; // todo el historial, del más nuevo al más viejo
}

export async function getWeightPage(profile: Profile, rangeDays: number): Promise<WeightPageData> {
  const db = forUser(profile.id);
  const todayISO = localTodayISO(profile.timezone);

  const [all, goal] = await db.$transaction([
    db.weightEntry.findMany({
      orderBy: { date: 'asc' },
      select: { id: true, date: true, weightKg: true, note: true },
    }),
    db.goal.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { startWeightKg: true, targetWeightKg: true },
    }),
  ]);

  const points: WeightPoint[] = all.map((e) => ({
    date: e.date.toISOString().slice(0, 10),
    weightKg: e.weightKg,
  }));

  const summary = weightSummary(points, goal, todayISO, rangeDays);

  // A diferencia del gráfico (acotado a `rangeDays`), la lista de "Registros"
  // se navega semana por semana en el cliente (ver EntryList) y necesita el
  // historial completo para poder ir hacia atrás sin depender del rango del
  // gráfico.
  const entries: WeightEntryDTO[] = all
    .map((e) => ({
      id: e.id,
      date: e.date.toISOString().slice(0, 10),
      weightKg: e.weightKg,
      note: e.note,
    }))
    .reverse();

  return { todayISO, rangeDays, entries, ...summary };
}
