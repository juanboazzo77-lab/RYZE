import type { Metadata } from 'next';
import { requireOwnerPage } from '@/lib/owner';
import { prisma } from '@/server/db';
import { listMessages } from '@/server/gym-messages';
import { MessageForm } from '@/features/owner/message-form';
import { MessageEndButton } from '@/features/owner/message-end-button';

export const metadata: Metadata = { title: 'Mensajes a clientes' };
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const fmt = (iso: string) => new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });

/** Avisos del gimnasio a todos sus clientes conectados: aparecen en la pantalla principal de la app y después desaparecen. */
export default async function GymMessagesPage() {
  const owner = await requireOwnerPage();
  const [messages, connected] = await Promise.all([
    listMessages(owner.userId, owner.gym.id).then((m) => m ?? []),
    prisma.gymMember.count({ where: { gymId: owner.gym.id, status: 'ACTIVE' } }),
  ]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mensajes a clientes</h1>
        <p className="text-sm text-muted-foreground">
          Un aviso para todos tus clientes conectados (feriado, cambio de horario, novedad). Les aparece como una ventana en la pantalla principal de la app, les llega una notificación y, pasado el tiempo que elijas, desaparece solo. Para hablar con una sola persona usá el botón de WhatsApp de su ficha.
        </p>
      </div>
      <MessageForm connected={connected} />
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
                  <p className="text-xs text-muted-foreground">{fmt(m.createdAt)}</p>
                </div>
                <p className="line-clamp-3 whitespace-pre-line text-muted-foreground">{m.body}</p>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <p className={`text-xs ${m.active ? 'font-medium text-emerald-600' : 'text-muted-foreground'}`}>{m.active ? `Se ve en la app hasta el ${fmt(m.expiresAt)}` : 'Ya no se muestra en la app'}</p>
                  {m.active ? <MessageEndButton id={m.id} /> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
