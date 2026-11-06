import type { Metadata } from 'next';
import { listPendingGroups, listUnsentApproved } from '@/server/invites';
import { PendingInvites } from '@/features/gym/pending-invites';
import { ResendButton } from '@/features/gym/resend-button';

export const metadata: Metadata = { title: 'Altas', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminInvitesPage() {
  const [groups, unsent] = await Promise.all([listPendingGroups(), listUnsentApproved()]);
  const total = groups.reduce((n, g) => n + g.invites.length, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Altas de socios</h1>
        <p className="text-xs text-muted-foreground">
          Los gimnasios cargan los mails de sus clientes. Al aprobarlos, cada persona recibe su invitación por mail y se reserva un lugar del cupo del gimnasio. {total} esperando tu decisión.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">No hay altas pendientes.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <PendingInvites key={g.gymId} group={g} />
          ))}
        </div>
      )}

      {unsent.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Mails sin enviar</h2>
          <p className="text-xs text-muted-foreground">Quedaron aprobados pero el mail no salió. Reenvialos.</p>
          <ul className="divide-y rounded-xl border">
            {unsent.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="min-w-0 truncate">
                  {u.email} <span className="text-xs text-muted-foreground">· {u.gymName}</span>
                </span>
                <ResendButton id={u.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
