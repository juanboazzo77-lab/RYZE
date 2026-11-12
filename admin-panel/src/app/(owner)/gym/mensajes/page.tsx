import type { Metadata } from 'next';
import { requireOwnerPage } from '@/lib/owner';
import { prisma } from '@/server/db';
import { listMessages } from '@/server/gym-messages';
import { MessageForm } from '@/features/owner/message-form';

export const metadata: Metadata = { title: 'Mensajes a clientes' };
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const fmt = (iso: string) => new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });

/** Avisos del gimnasio a sus clientes: feriados, cambios de horario, novedades. */
export default async function GymMessagesPage() {
  const owner = await requireOwnerPage();
  const [messages, withEmail] = await Promise.all([
    listMessages(owner.userId, owner.gym.id).then((m) => m ?? []),
    prisma.gymClient.count({ where: { gymId: owner.gym.id, active: true, email: { not: null } } }),
  ]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mensajes a clientes</h1>
        <p className="text-sm text-muted-foreground">Avisales a tus clientes un feriado, un cambio de horario o una novedad. Lo ven en su app y, si querés, les llega por mail.</p>
      </div>
      <MessageForm clientsWithEmail={withEmail} />
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Mensajes enviados</h2>
        {messages.length === 0 ? (
          <p className="rounded-xl border p-3 text-sm text-muted-foreground">Todavía no mandaste ningún mensaje.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {messages.map((m) => (
              <li key={m.id} className="space-y-1 px-3 py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(m.createdAt)}
                    {m.emailed ? ' · también por mail' : ''}
                  </p>
                </div>
                <p className="line-clamp-3 whitespace-pre-line text-muted-foreground">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
