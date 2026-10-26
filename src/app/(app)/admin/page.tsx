import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireUser } from '@/server/context';
import { getAdminStats, isAdmin } from '@/server/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Panel', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const usd = (n: number) => `US$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const usd4 = (n: number) => `US$ ${n.toFixed(4)}`;

export default async function AdminPage() {
  const ctx = await requireUser();
  // Sin ADMIN_EMAILS definido, o con otro mail, la página directamente no existe.
  if (!isAdmin(ctx.email)) notFound();
  let s: Awaited<ReturnType<typeof getAdminStats>>;
  try {
    s = await getAdminStats();
  } catch (e) {
    // Las consultas son a mano (SQL): si alguna falla se ve el motivo en vez de una pantalla rota.
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Panel interno</h1>
        <p className="text-sm text-destructive">No se pudieron calcular los números.</p>
        <pre className="overflow-x-auto rounded-md bg-secondary p-3 text-xs">
          {e instanceof Error ? e.message : String(e)}
        </pre>
      </div>
    );
  }
  const maxSignup = Math.max(1, ...s.signupsByDay.map((d) => d.n));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel interno</h1>
        <p className="text-xs text-muted-foreground">
          Actualizado {new Date(s.generatedAt).toLocaleString('es-AR')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Usuarios" value={s.users.total} sub={`${s.users.onboarded} completaron el alta`} />
        <Kpi label="Nuevos 7 días" value={s.users.new7} sub={`${s.users.new30} en 30 días`} />
        <Kpi label="Activos hoy" value={s.active.d1} sub={`${s.active.d7} en 7 días`} />
        <Kpi label="Activos 30 días" value={s.active.d30} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Prueba gratis → pago</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 pt-0 sm:grid-cols-4">
          <Kpi label="En prueba ahora" value={s.funnel.inTrial} flat />
          <Kpi label="Prueba terminada" value={s.funnel.trialEnded} flat />
          <Kpi label="Pasaron a pagar" value={s.funnel.paidOfEnded} flat />
          <Kpi
            label="Conversión"
            value={s.funnel.conversionPct === null ? '—' : `${s.funnel.conversionPct}%`}
            flat
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Usuarios por plan</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table
            head={['Plan', 'Usuarios']}
            rows={s.tiers.map((t) => [t.tier, String(t.users)])}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Altas por día (14 días)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {s.signupsByDay.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin altas en los últimos 14 días.</p>
          ) : (
            <div className="flex h-24 items-end gap-1">
              {s.signupsByDay.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.n}`}>
                  <span className="text-[10px] tabular-nums text-muted-foreground">{d.n}</span>
                  <div className="w-full rounded-t bg-primary" style={{ height: `${(d.n / maxSignup) * 64}px` }} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Costo de IA (30 días): {usd(s.ai.cost30)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <Table
            head={['Plan', 'Usuarios con IA', 'Costo', 'Por usuario']}
            rows={s.ai.byTier.map((t) => [t.tier, String(t.users), usd(t.costUsd), usd(t.perUserUsd)])}
          />
          <Table
            head={['Tarea', 'Mensajes', 'Costo']}
            rows={s.ai.byTask.map((t) => [t.task, String(t.messages), usd(t.costUsd)])}
          />
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Los 5 que más gastan</p>
            <Table
              head={['Mail', 'Plan', 'Costo']}
              rows={s.ai.topUsers.map((t) => [t.email, t.tier, usd4(t.costUsd)])}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Rentabilidad mensual estimada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Ingreso bruto" value={usd(s.revenue.grossMonthlyUsd)} flat />
            <Kpi label="Neto de la tienda" value={usd(s.revenue.netMonthlyUsd)} flat />
            <Kpi label="Costo de IA" value={usd(s.revenue.aiCostMonthlyUsd)} flat />
            <Kpi
              label="Margen"
              value={usd(s.revenue.marginUsd)}
              flat
              tone={s.revenue.marginUsd >= 0 ? 'good' : 'bad'}
            />
          </div>
          <p className="text-xs text-muted-foreground">{s.revenue.note}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  flat,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  flat?: boolean;
  tone?: 'good' | 'bad';
}) {
  const body = (
    <div className="space-y-0.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-xl font-bold tabular-nums',
          tone === 'good' && 'text-success',
          tone === 'bad' && 'text-destructive',
        )}
      >
        {value}
      </p>
      {sub ? <p className="text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
  return flat ? body : (
    <Card>
      <CardContent className="pt-4">{body}</CardContent>
    </Card>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Sin datos todavía.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {head.map((h) => (
              <th key={h} className="py-1.5 pr-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              {r.map((c, j) => (
                <td key={j} className="py-1.5 pr-3 tabular-nums">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
