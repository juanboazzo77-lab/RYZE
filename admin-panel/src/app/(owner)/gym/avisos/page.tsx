import type { Metadata } from 'next';
import { requireOwnerPage } from '@/lib/owner';
import { listNoticesForGym, markNoticesRead } from '@/server/gym-notices';

export const metadata: Metadata = { title: 'Avisos de Forza AI' };
export const dynamic = 'force-dynamic';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });

/** Los avisos que Forza AI le manda al gimnasio. Al abrir esta pantalla quedan como leídos. */
export default async function GymNoticesPage() {
  const owner = await requireOwnerPage();
  const notices = await listNoticesForGym(owner.gym.id).catch(() => []);
  await markNoticesRead(owner.gym.id).catch(() => undefined);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Avisos de Forza AI</h1>
        <p className="text-sm text-muted-foreground">Novedades y avisos para tu gimnasio.</p>
      </div>
      {notices.length === 0 ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">Todavía no hay avisos.</p>
      ) : (
        <ul className="space-y-3">
          {notices.map((n) => (
            <li key={n.id} className={`space-y-1.5 rounded-xl border p-4 ${n.read ? '' : 'border-primary/40 bg-primary/5'}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">{n.title}</p>
                <p className="text-xs text-muted-foreground">{fmt(n.createdAt)}</p>
              </div>
              <p className="whitespace-pre-line text-sm">{n.body}</p>
              {n.link ? (
                <a href={n.link} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-medium underline">
                  Ver más
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
