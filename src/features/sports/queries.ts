import 'server-only';
import { DateTime } from 'luxon';
import type { Profile } from '@prisma/client';
import { forUser } from '@/server/user-db';
import { isoToUtcDate, localTodayISO } from '@/lib/date';

export interface CompetitionView {
  id: string;
  name: string;
  dateISO: string;
  priority: string;
  sportProfileId: string | null;
  notes: string | null;
  daysUntil: number;
}

export interface SportView {
  id: string;
  name: string;
  level: string | null;
  sessionsPerWeek: number;
  sessionDays: number[];
  goal: string | null;
  notes: string | null;
  isPrimary: boolean;
  competitions: CompetitionView[];
}

function toIntArray(v: unknown): number[] {
  return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : [];
}

/** Todos los deportes del usuario + sus competencias (todas, ordenadas por fecha). */
export async function getSports(profile: Profile): Promise<SportView[]> {
  const db = forUser(profile.id);
  const todayISO = localTodayISO(profile.timezone);

  const rows = await db.sportProfile.findMany({
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    include: { competitions: { orderBy: { date: 'asc' } } },
  });

  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    level: s.level,
    sessionsPerWeek: s.sessionsPerWeek,
    sessionDays: toIntArray(s.sessionDays),
    goal: s.goal,
    notes: s.notes,
    isPrimary: s.isPrimary,
    competitions: s.competitions.map((c) => ({
      id: c.id,
      name: c.name,
      dateISO: c.date.toISOString().slice(0, 10),
      priority: c.priority,
      sportProfileId: c.sportProfileId,
      notes: c.notes,
      daysUntil: Math.round(
        DateTime.fromISO(c.date.toISOString().slice(0, 10)).diff(
          DateTime.fromISO(todayISO),
          'days',
        ).days,
      ),
    })),
  }));
}

/** Competencias futuras (o de hoy) dentro de `withinDays`, ordenadas por cercanía. */
export async function getUpcomingCompetitions(
  profile: Profile,
  withinDays = 120,
): Promise<Array<CompetitionView & { sportName: string | null }>> {
  const db = forUser(profile.id);
  const todayISO = localTodayISO(profile.timezone);
  const from = isoToUtcDate(todayISO);
  const to = isoToUtcDate(DateTime.fromISO(todayISO).plus({ days: withinDays }).toISODate()!);

  const rows = await db.competition.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { date: 'asc' },
    include: { sportProfile: { select: { name: true } } },
  });

  return rows.map((c) => {
    const dateISO = c.date.toISOString().slice(0, 10);
    return {
      id: c.id,
      name: c.name,
      dateISO,
      priority: c.priority,
      sportProfileId: c.sportProfileId,
      notes: c.notes,
      sportName: c.sportProfile?.name ?? null,
      daysUntil: Math.round(
        DateTime.fromISO(dateISO).diff(DateTime.fromISO(todayISO), 'days').days,
      ),
    };
  });
}

const WD = ['', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

/**
 * Bloque de texto de deportes + competencias para el contexto del AI Coach.
 * Vacío si el usuario no cargó ningún deporte.
 */
export async function buildSportContextLines(profile: Profile): Promise<string[]> {
  const sports = await getSports(profile);
  if (sports.length === 0) return [];

  const lines: string[] = ['Deportes que practica (el gimnasio es complementario a esto):'];
  for (const s of sports) {
    const days = s.sessionDays.length
      ? s.sessionDays.map((d) => WD[d]).filter(Boolean).join(', ')
      : `${s.sessionsPerWeek}/sem`;
    lines.push(
      `  - ${s.name}${s.level ? ` (${s.level})` : ''}: ${s.sessionsPerWeek} sesiones/sem` +
        (s.sessionDays.length ? ` (${days})` : '') +
        (s.goal ? `. Objetivo: ${s.goal}` : '') +
        (s.notes ? `. Nota: ${s.notes}` : ''),
    );
  }

  const comps = (await getUpcomingCompetitions(profile, 180)).slice(0, 6);
  if (comps.length > 0) {
    lines.push('Competencias próximas:');
    for (const c of comps) {
      lines.push(
        `  - ${c.name}${c.sportName ? ` (${c.sportName})` : ''} — ${c.dateISO}, ` +
          `prioridad ${c.priority}, en ${c.daysUntil} días${c.notes ? `. ${c.notes}` : ''}`,
      );
    }
  }
  return lines;
}

/** Sesiones de deporte por semana sumadas (para ajustar el gasto calórico). */
export async function totalSportSessionsPerWeek(profile: Profile): Promise<number> {
  const db = forUser(profile.id);
  const rows = await db.sportProfile.findMany({ select: { sessionsPerWeek: true } });
  return rows.reduce((a, r) => a + (r.sessionsPerWeek || 0), 0);
}
