import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, Trophy } from 'lucide-react';
import { requireUser } from '@/server/context';
import { listChallengesForMember } from '@/server/gym-challenges';
import { metricInfo } from '@/features/gym/challenges';
import { ChallengeJoinButton } from '@/features/gym/challenge-join-button';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Retos del gimnasio' };
export const dynamic = 'force-dynamic';

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Los retos del gimnasio del socio: sumarse y ver el ranking. */
export default async function GymChallengesPage() {
  const ctx = await requireUser();
  const challenges = ctx.gym ? await listChallengesForMember(ctx.userId, ctx.gym.gymId) : [];

  return (
    <div className="space-y-4">
      <Link href="/training/gym" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        {ctx.gym?.name ?? 'Tu gimnasio'}
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Retos</h1>
        <p className="text-sm text-muted-foreground">Desafíos entre los socios de tu gimnasio. El puntaje sale solo de tus entrenamientos en Forza AI.</p>
      </div>

      {challenges.length === 0 ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">Tu gimnasio todavía no armó ningún reto. Cuando lo haga, lo vas a ver acá.</p>
      ) : (
        <ul className="space-y-4">
          {challenges.map((c) => {
            const m = metricInfo(c.metric);
            return (
              <li key={c.id} className="space-y-3 rounded-2xl border border-l-[6px] border-l-primary bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{c.title}</p>
                    {c.description ? <p className="text-sm text-muted-foreground">{c.description}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {fmtDay(c.startsOn)} al {fmtDay(c.endsOn)} · suma {m.unit}
                    </p>
                  </div>
                  <Badge variant={c.status === 'ACTIVE' ? 'success' : 'secondary'}>
                    {c.status === 'ACTIVE' ? (c.daysLeft === 0 ? 'Último día' : `Faltan ${c.daysLeft} d`) : c.status === 'UPCOMING' ? 'Próximo' : 'Terminó'}
                  </Badge>
                </div>

                {c.prize ? (
                  <p className="flex items-start gap-2 rounded-lg bg-accent p-2.5 text-sm">
                    <Trophy className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      <span className="font-medium">Premio:</span> {c.prize}
                    </span>
                  </p>
                ) : null}

                {c.status !== 'ENDED' ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {c.entrants} {c.entrants === 1 ? 'socio sumado' : 'socios sumados'}
                      {c.joined ? '' : ' · al sumarte aparecés en el ranking con tu nombre y la inicial del apellido'}
                    </p>
                    <ChallengeJoinButton id={c.id} joined={c.joined} />
                  </div>
                ) : null}

                {c.top.length > 0 && c.status !== 'UPCOMING' ? (
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">Ranking</p>
                    <ol className="divide-y rounded-lg border">
                      {c.top.map((r) => (
                        <li key={r.userId} className={`flex items-center gap-3 px-3 py-2 text-sm ${r.userId === ctx.userId ? 'bg-accent font-medium' : ''}`}>
                          <span className="w-6 shrink-0 tabular-nums text-muted-foreground">{r.position}°</span>
                          <span className="min-w-0 flex-1 truncate">{r.userId === ctx.userId ? `${r.name} (vos)` : r.name}</span>
                          <span className="shrink-0 tabular-nums">
                            {r.score} <span className="text-xs text-muted-foreground">{r.score === 1 ? m.unitOne : m.unit}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                    {c.me && !c.top.some((r) => r.userId === ctx.userId) ? (
                      <p className="text-xs text-muted-foreground">
                        Vos vas {c.me.position}° con {c.me.score} {c.me.score === 1 ? m.unitOne : m.unit}.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
