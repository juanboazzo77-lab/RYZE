import Link from 'next/link';
import { DateTime } from 'luxon';
import { Trophy } from 'lucide-react';
import type { Profile } from '@prisma/client';
import { getT } from '@/i18n/server';
import { interpolate } from '@/i18n';
import { getUpcomingCompetitions } from './queries';

/** Banner del dashboard con la competencia más próxima (dentro de 60 días). */
export async function CompetitionBanner({ profile }: { profile: Profile }) {
  const comps = await getUpcomingCompetitions(profile, 60);
  const next = comps[0];
  if (!next) return null;

  const { t, locale } = await getT();
  const c = t.dashboard.competition;
  const when =
    next.daysUntil <= 0
      ? c.today
      : next.daysUntil === 1
        ? c.tomorrow
        : interpolate(c.inDays, { n: next.daysUntil });
  const dateLabel = DateTime.fromISO(next.dateISO).setLocale(locale).toFormat('d LLL');

  return (
    <Link
      href="/settings/sports"
      className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3 transition-colors hover:bg-primary/10"
    >
      <Trophy className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {c.title}: {next.name}
          {next.sportName ? ` · ${next.sportName}` : ''}
        </p>
        <p className="text-xs text-muted-foreground">
          {dateLabel} · {when} · {c.priorityShort} {next.priority}
        </p>
      </div>
    </Link>
  );
}
