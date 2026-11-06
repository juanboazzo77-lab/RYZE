import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarCheck, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
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
        <h1 className="text-2xl font-bold tracking-tight">{ctx.gym?.name ?? 'Tu gimnasio'}</h1>
        <p className="text-sm text-muted-foreground">Todo lo de tu gimnasio, en un solo lugar.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/training/gym/clases" className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-accent">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <CalendarCheck className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Reservar clase</span>
            <span className="block text-xs text-muted-foreground">Elegí día y horario</span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <Link href="/training/gym/retos" className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-accent">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Trophy className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Retos</span>
            <span className="block text-xs text-muted-foreground">Sumate y mirá el ranking</span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
      </div>

      <h2 className="text-lg font-semibold">Rutinas de tu gimnasio</h2>

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
