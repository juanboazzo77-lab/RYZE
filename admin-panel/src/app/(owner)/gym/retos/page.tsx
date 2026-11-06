import type { Metadata } from 'next';
import { Trophy } from 'lucide-react';
import { requireOwnerPage } from '@/lib/owner';
import { listOwnerChallenges } from '@/server/gym-challenges';
import { todayArgentina } from '@/server/gym-fees';
import { ChallengeForm } from '@/features/owner/challenge-form';
import { ChallengeDeleteButton } from '@/features/owner/challenge-delete-button';
import { metricInfo } from '@/features/gym/challenges';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Retos' };
export const dynamic = 'force-dynamic';

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Último día del mes de `iso` (yyyy-mm-dd). */
function endOfMonth(iso: string): string {
  const [y, m] = iso.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** Retos entre los socios: se crean acá, los socios con Forza AI los ven y se suman desde la app. */
export default async function GymChallengesPage() {
  const owner = await requireOwnerPage();
  const today = todayArgentina();
  const challenges = (await listOwnerChallenges(owner.userId, owner.gym.id, today)) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Retos</h1>
        <p className="text-sm text-muted-foreground">
          Un desafío entre tus socios con Forza AI, por ejemplo "quién entrena más este mes". El puntaje sale solo de los entrenamientos que completan en la app. Es una buena forma de que no abandonen.
        </p>
      </div>

      <ChallengeForm today={today} nextMonthEnd={endOfMonth(today)} />

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Tus retos</h2>
        {challenges.length === 0 ? (
          <p className="rounded-xl border p-3 text-sm text-muted-foreground">Todavía no armaste ninguno.</p>
        ) : (
          challenges.map((c) => {
            const m = metricInfo(c.metric);
            return (
              <div key={c.id} className="space-y-3 rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDay(c.startsOn)} al {fmtDay(c.endsOn)} · suma {m.unit} · {c.entrants} {c.entrants === 1 ? 'socio sumado' : 'socios sumados'}
                    </p>
                  </div>
                  <Badge variant={c.status === 'ACTIVE' ? 'success' : 'secondary'}>{c.status === 'ACTIVE' ? 'En curso' : c.status === 'UPCOMING' ? 'Próximo' : 'Terminó'}</Badge>
                </div>
                {c.prize ? (
                  <p className="flex items-center gap-2 text-sm">
                    <Trophy className="size-4 text-primary" />
                    Premio: {c.prize}
                  </p>
                ) : null}
                {c.top.length > 0 ? (
                  <ol className="divide-y rounded-lg border">
                    {c.top.map((r) => (
                      <li key={r.userId} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <span className="w-6 shrink-0 tabular-nums text-muted-foreground">{r.position}°</span>
                        <span className="min-w-0 flex-1 truncate">{r.name}</span>
                        <span className="shrink-0 tabular-nums">
                          {r.score} <span className="text-xs text-muted-foreground">{r.score === 1 ? m.unitOne : m.unit}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-muted-foreground">Todavía nadie se sumó. Avisales a tus socios que entren a la app y toquen "Sumarme".</p>
                )}
                <div className="flex justify-end">
                  <ChallengeDeleteButton id={c.id} title={c.title} />
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
