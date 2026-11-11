import type { Metadata } from 'next';
import { listGymsToNotify, listNoticesForAdmin } from '@/server/gym-notices';
import { NoticeForm } from '@/features/admin/notice-form';

export const metadata: Metadata = { title: 'Avisos a gimnasios' };
export const dynamic = 'force-dynamic';
// Los mails de un aviso salen de a uno en segundo plano.
export const maxDuration = 60;

const fmt = (iso: string) => new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });

/** Avisos del administrador a todos los gimnasios (o a algunos): se ven en su panel y, si se elige, les llegan por mail. */
export default async function NoticesPage() {
  const [gyms, notices] = await Promise.all([listGymsToNotify(), listNoticesForAdmin()]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Avisos a gimnasios</h1>
        <p className="text-sm text-muted-foreground">Escribí un aviso y llega al panel de los gimnasios (y por mail si querés). Así no tenés que escribirle a cada uno por WhatsApp o Instagram.</p>
      </div>

      <NoticeForm gyms={gyms} />

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Avisos enviados</h2>
        {notices.length === 0 ? (
          <p className="rounded-xl border p-3 text-sm text-muted-foreground">Todavía no mandaste ningún aviso.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {notices.map((n) => (
              <li key={n.id} className="space-y-1 px-3 py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{fmt(n.createdAt)}</p>
                </div>
                <p className="line-clamp-2 whitespace-pre-line text-muted-foreground">{n.body}</p>
                <p className="text-xs text-muted-foreground">
                  {n.toAll ? 'A todos' : `A ${n.recipients} ${n.recipients === 1 ? 'gimnasio' : 'gimnasios'}`} · lo leyeron {n.readBy} de {n.recipients}
                  {n.emailed ? ' · también por mail' : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
