import type { Metadata } from 'next';
import Link from 'next/link';
import { listErrors } from '@/server/app-errors';
import { Badge } from '@/components/ui/badge';
import { ResolveButton } from '@/features/admin/resolve-button';
import { ago } from '@/features/admin/ui';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Errores', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminErrorsPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const resolved = ver === 'resueltos';
  const rows = await listErrors(resolved ? 'RESOLVED' : 'OPEN');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Errores</h1>
        <p className="text-xs text-muted-foreground">
          Lo que le falla a la gente, agrupado: el mismo error suma una vez más en vez de repetirse. Si vuelve a pasar uno resuelto, se reabre solo.
        </p>
      </div>

      <div className="flex gap-1">
        {[
          { href: '/errores', label: 'Abiertos', active: !resolved },
          { href: '/errores?ver=resueltos', label: 'Resueltos', active: resolved },
        ].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={cn('rounded-full px-3 py-1 text-sm', t.active ? 'bg-secondary font-medium' : 'text-muted-foreground hover:bg-secondary/60')}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">
          {resolved ? 'Todavía no resolviste ninguno.' : 'No hay errores abiertos. Cuando a alguien le falle algo, aparece acá.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((e) => (
            <li key={e.id} className="space-y-2 rounded-xl border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 flex-1 break-words text-sm font-medium">{e.message}</p>
                <Badge variant={e.source === 'server' ? 'warning' : 'secondary'}>{e.source === 'server' ? 'Servidor' : 'Pantalla'}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {e.path ?? 'sin ruta'} · {e.count} {e.count === 1 ? 'vez' : 'veces'} · último {ago(e.lastSeen)} · primero{' '}
                {new Date(e.firstSeen).toLocaleDateString('es-AR')}
                {e.userEmail ? ` · ${e.userEmail}` : ''}
              </p>
              {e.stack ? (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Ver detalle técnico</summary>
                  <pre className="mt-1 max-h-60 overflow-auto rounded-md bg-secondary p-2 text-[11px] leading-snug">{e.stack}</pre>
                </details>
              ) : null}
              <ResolveButton id={e.id} resolved={resolved} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
