import type { Metadata } from 'next';
import { getSubscribers } from '@/server/admin-hub';
import { Badge } from '@/components/ui/badge';
import { Kpi, ago } from '@/features/admin/ui';

export const metadata: Metadata = { title: 'Suscriptores', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const TIER_LABEL: Record<string, string> = { BASIC: 'Basic', PRO: 'Pro', COACH: 'Coach' };

export default async function AdminSubscribersPage() {
  const v = await getSubscribers();
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Suscriptores</h1>
        <p className="text-xs text-muted-foreground">
          Las personas con un plan pago (Basic, Pro o Coach). “Desde” es la última vez que cambió su plan. Los que usan la app gratis por un gimnasio no figuran acá.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Nuevos (7 días)" value={v.new7} sub={`${v.new30} en 30 días`} tone={v.new7 > 0 ? 'good' : 'normal'} />
        <Kpi label="Pago fallido" value={v.pastDue} sub="Hay que avisarles" tone={v.pastDue > 0 ? 'alert' : 'normal'} />
        <Kpi label="Cancelados" value={v.canceled} />
        <Kpi label="Activos" value={v.byTier.reduce((s, t) => s + t.n, 0)} sub={v.byTier.map((t) => `${t.n} ${TIER_LABEL[t.tier] ?? t.tier}`).join(' · ') || undefined} />
      </div>

      {v.rows.length === 0 ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">Todavía no hay suscriptores pagos.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {v.rows.map((r) => (
            <li key={r.userId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {r.email}
                  {r.isNew && r.status === 'ACTIVE' ? <Badge variant="success" className="ml-2 text-[10px]">Nuevo</Badge> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  Desde {fmt(r.since)} ({ago(r.since)}){r.periodEnd ? ` · renueva ${fmt(r.periodEnd)}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="secondary">{TIER_LABEL[r.tier] ?? r.tier}</Badge>
                {r.status === 'PAST_DUE' ? <Badge variant="warning">Pago fallido</Badge> : null}
                {r.status === 'CANCELED' ? <Badge variant="outline">Cancelado</Badge> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
