import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireOwnerPage } from '@/lib/owner';
import { listRoutines } from '@/server/gym-routines';
import { RoutineRow } from '@/features/owner/routine-row';

export const metadata: Metadata = { title: 'Rutinas' };
export const dynamic = 'force-dynamic';

/** Las rutinas oficiales del gimnasio: las arma el profe y los socios con Forza AI las ven en la app. */
export default async function GymRoutinesPage() {
  const owner = await requireOwnerPage();
  const rows = (await listRoutines(owner.userId, owner.gym.id)) ?? [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rutinas del gimnasio</h1>
          <p className="text-sm text-muted-foreground">Tus socios con Forza AI las ven en la app, además del plan que arma la IA.</p>
        </div>
        <Link
          href="/gym/rutinas/nueva"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Nueva rutina
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">Todavía no cargaste rutinas. Armá la primera: por ejemplo "Fuerza 3 días" o "Principiantes".</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {rows.map((r) => (
            <RoutineRow key={r.id} r={r} />
          ))}
        </ul>
      )}
    </div>
  );
}
