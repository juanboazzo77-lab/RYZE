import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { listMemberRoutines } from '@/server/gym-routines';
import { countExercises, levelLabel } from '@/features/gym/routines';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Rutinas del gimnasio' };
export const dynamic = 'force-dynamic';

/** Las rutinas oficiales del gimnasio del socio. */
export default async function GymRoutinesPage() {
  const ctx = await requireUser();
  const routines = ctx.gym ? await listMemberRoutines(ctx.gym.gymId) : [];

  return (
    <div className="space-y-4">
      <Link href="/training" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Entrenamiento
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rutinas de {ctx.gym?.name ?? 'tu gimnasio'}</h1>
        <p className="text-sm text-muted-foreground">Armadas por los profes de tu gimnasio.</p>
        <Link href="/training/gym/retos" className="mt-1 inline-block text-sm font-medium text-primary underline">
          Ver los retos del gimnasio
        </Link>
      </div>

      {routines.length === 0 ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">Tu gimnasio todavía no cargó rutinas. Mientras tanto, usá tu plan de entrenamiento de Forza AI.</p>
      ) : (
        <ul className="space-y-3">
          {routines.map((r) => {
            const level = levelLabel(r.level);
            return (
              <li key={r.id}>
                <details className="group rounded-xl border bg-card">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-semibold">{r.title}</p>
                      {r.description ? <p className="text-sm text-muted-foreground">{r.description}</p> : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.days.length} {r.days.length === 1 ? 'día' : 'días'} · {countExercises(r.days)} ejercicios
                      </p>
                    </div>
                    {level ? <Badge variant="secondary">{level}</Badge> : null}
                  </summary>
                  <div className="space-y-4 border-t p-4">
                    {r.days.map((d, i) => (
                      <div key={i} className="space-y-2">
                        <p className="text-sm font-semibold">{d.name}</p>
                        <ul className="divide-y rounded-lg border">
                          {d.exercises.map((e, j) => (
                            <li key={j} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                              <span className="min-w-0">
                                {e.name}
                                {e.note ? <span className="block text-xs text-muted-foreground">{e.note}</span> : null}
                              </span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">{[e.sets && `${e.sets} x`, e.reps].filter(Boolean).join(' ')}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
