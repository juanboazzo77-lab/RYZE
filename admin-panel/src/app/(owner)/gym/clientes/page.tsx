import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireOwnerPage } from '@/lib/owner';
import { countClients, listClients } from '@/server/gym-clients';
import { AddClientsForm } from '@/features/owner/add-clients-form';
import { ClientRow } from '@/features/owner/client-row';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Clientes' };
export const dynamic = 'force-dynamic';

const FILTERS = [
  { key: 'cobrar', label: 'Para cobrar', match: (s: string) => ['DUE_TODAY', 'OVERDUE', 'LAPSED'].includes(s) },
  { key: 'semana', label: 'Vencen esta semana', match: (s: string) => ['DUE_TODAY', 'SOON'].includes(s) },
  { key: 'aldia', label: 'Al día', match: (s: string) => s === 'OK' },
  { key: 'todos', label: 'Todos', match: () => true },
] as const;

/** Sistema de gestión del gimnasio: sus clientes, quién pagó y a quién le toca pagar. */
export default async function GymClientsPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const owner = await requireOwnerPage();
  const { f, q } = await searchParams;
  const rows = (await listClients(owner.userId, owner.gym.id)) ?? [];
  const counts = countClients(rows);
  const toCollect = counts.dueToday + counts.overdue + counts.lapsed;
  // Por defecto, lo que hay que cobrar; si no hay nada, todos.
  const active = FILTERS.find((x) => x.key === f) ?? (toCollect > 0 ? FILTERS[0] : FILTERS[3]);
  const term = (q ?? '').trim().toLowerCase();
  const shown = rows.filter((r) => active.match(r.status) && (!term || r.name.toLowerCase().includes(term) || (r.email ?? '').includes(term)));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="text-xs text-muted-foreground">
          {counts.total} {counts.total === 1 ? 'cliente' : 'clientes'} · {counts.dueToday} vencen hoy · {counts.overdue + counts.lapsed} vencidas · {counts.soon} por vencer esta semana
        </p>
      </div>

      {toCollect > 0 ? (
        <p className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">
          Hoy tenés <strong>{toCollect}</strong> {toCollect === 1 ? 'cuota para cobrar' : 'cuotas para cobrar'}
          {counts.dueToday > 0 ? ` (${counts.dueToday} vencen hoy)` : ''}. Cuando te paguen, tocá <strong>Pagó</strong>.
        </p>
      ) : counts.total > 0 ? (
        <p className="rounded-xl border p-3 text-sm text-muted-foreground">No hay cuotas para cobrar hoy. ¡Todo al día!</p>
      ) : null}

      <AddClientsForm defaultOpen={counts.total === 0} />

      {counts.total > 0 ? (
        <>
          <div className="flex gap-1 overflow-x-auto">
            {FILTERS.map((x) => (
              <Link
                key={x.key}
                href={`/gym/clientes?f=${x.key}`}
                className={cn('shrink-0 rounded-full px-3 py-1 text-sm', x.key === active.key ? 'bg-secondary font-medium' : 'text-muted-foreground hover:bg-secondary/60')}
              >
                {x.label}
                {x.key === 'cobrar' && toCollect > 0 ? ` (${toCollect})` : ''}
              </Link>
            ))}
          </div>

          <form action="/gym/clientes" className="flex gap-2">
            <input type="hidden" name="f" value={active.key} />
            <input name="q" defaultValue={q ?? ''} placeholder="Buscar por nombre o mail" className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm" />
          </form>

          {shown.length === 0 ? (
            <p className="rounded-xl border p-4 text-sm text-muted-foreground">No hay clientes en esta lista.</p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {shown.map((c) => (
                <ClientRow key={c.id} c={c} gymName={owner.gym.name} />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
