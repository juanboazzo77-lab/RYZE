import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/server/context';
import { getOwnerView, listInvitesForOwner } from '@/server/gyms';
import { InviteForm } from '@/features/gym/invite-form';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Invitar socios' };
export const dynamic = 'force-dynamic';

const LABEL = {
  PENDING: { text: 'Esperando aprobación', variant: 'secondary' as const },
  APPROVED: { text: 'Invitación enviada', variant: 'warning' as const },
  JOINED: { text: 'Ya es socio', variant: 'success' as const },
  REJECTED: { text: 'No aprobado', variant: 'secondary' as const },
};

export default async function GymInvitesPage() {
  const ctx = await requireUser();
  if (!ctx.ownedGym) redirect('/dashboard');
  const [view, invites] = await Promise.all([getOwnerView(ctx.userId, ctx.ownedGym.id), listInvitesForOwner(ctx.userId, ctx.ownedGym.id)]);
  if (!view) redirect('/dashboard');
  const rows = invites ?? [];
  const count = (s: keyof typeof LABEL) => rows.filter((r) => r.status === s).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invitar socios</h1>
        <p className="text-sm text-muted-foreground">
          Cargá los mails de tus clientes. Nosotros revisamos el pedido, y cuando lo aprobamos cada uno recibe un mail con tu invitación a Forza AI. Sin costo para ellos.
        </p>
      </div>

      {view.status !== 'ACTIVE' ? (
        <p className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">
          {view.status === 'PENDING'
            ? 'Tu gimnasio todavía está en revisión: apenas lo aprobemos vas a poder invitar socios.'
            : 'Tu gimnasio está suspendido: por ahora no se pueden invitar socios. Escribinos a gimnasios@forzaai.app.'}
        </p>
      ) : null}

      <InviteForm disabled={view.status !== 'ACTIVE'} />

      <div className="rounded-xl bg-secondary/50 p-3 text-sm">
        <p className="font-medium">Lo que recibe cada cliente</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
          <li>Un plan de entrenamiento por mes, armado con las máquinas de tu gimnasio.</li>
          <li>Un plan de dieta por mes.</li>
          <li>Mensajes con la IA para sus dudas del día a día.</li>
        </ul>
      </div>

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">Tus pedidos</h2>
          <p className="text-xs text-muted-foreground">
            {count('JOINED')} socios · {count('APPROVED')} invitados · {count('PENDING')} esperando
          </p>
        </div>
        {rows.length === 0 ? (
          <p className="rounded-xl border p-3 text-sm text-muted-foreground">Todavía no cargaste ningún mail.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="min-w-0 truncate">{r.email}</span>
                <Badge variant={LABEL[r.status].variant}>{LABEL[r.status].text}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
