import type { Metadata } from 'next';
import { requireOwnerPage } from '@/lib/owner';
import { getGymReport } from '@/server/gym-reports';
import { formatMoney } from '@/features/gym/money';
import { monthLabel } from '@/features/gym/reports';
import { weekdayLabel } from '@/features/gym/classes';
import { PrintButton } from '@/features/owner/print-button';

export const metadata: Metadata = { title: 'Reportes' };
export const dynamic = 'force-dynamic';

function Bars({ labels, values, format }: { labels: string[]; values: number[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...values);
  return (
    <ul className="space-y-1.5">
      {labels.map((l, i) => (
        <li key={l} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 text-sm">
          <span className="text-xs text-muted-foreground">{monthLabel(l)}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${(values[i]! / max) * 100}%` }} />
          </span>
          <span className="tabular-nums">{format ? format(values[i]!) : values[i]}</span>
        </li>
      ))}
    </ul>
  );
}

/** Reportes del gimnasio: clientes, cobros, ocupación de clases y planes. */
export default async function GymReportsPage() {
  const owner = await requireOwnerPage();
  const r = await getGymReport(owner.userId, owner.gym.id);
  if (!r) return null;
  const totalCollected = r.collected.reduce((a, b) => a + b, 0);
  const planTotal = r.plans.reduce((a, p) => a + (p.monthly ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2 print:block">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
          <p className="text-sm text-muted-foreground">Cómo viene {owner.gym.name} en los últimos meses.</p>
        </div>
        <div className="print:hidden">
          <PrintButton />
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 rounded-xl border p-4">
          <h2 className="font-semibold">Clientes que se sumaron</h2>
          <p className="text-xs text-muted-foreground">Conectados a tu gimnasio con Forza AI. Hoy hay {r.activeNow} activos.</p>
          <Bars labels={r.months} values={r.joined} />
        </div>
        <div className="space-y-2 rounded-xl border p-4">
          <h2 className="font-semibold">Clientes que se fueron</h2>
          <p className="text-xs text-muted-foreground">Dejaron de estar conectados (cancelaron su plan o se fueron).</p>
          <Bars labels={r.months} values={r.left} />
        </div>
      </section>

      <section className="space-y-2 rounded-xl border p-4">
        <h2 className="font-semibold">Cuotas cobradas</h2>
        <p className="text-xs text-muted-foreground">Según los pagos que anotaste en Clientes con su monto. Total de los últimos {r.months.length} meses: {formatMoney(totalCollected, r.currency)}.</p>
        <Bars labels={r.months} values={r.collected} format={(n) => formatMoney(n, r.currency)} />
      </section>

      <section className="space-y-2 rounded-xl border p-4">
        <h2 className="font-semibold">Ocupación de las clases</h2>
        <p className="text-xs text-muted-foreground">Lugares tomados sobre los lugares disponibles, en las últimas 4 semanas.</p>
        {r.classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no cargaste clases.</p>
        ) : (
          <ul className="space-y-2">
            {r.classes.map((c, i) => (
              <li key={i} className="grid grid-cols-[1fr_auto] items-center gap-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {weekdayLabel(c.weekday)} {c.startTime} · {c.booked} reservas
                  </span>
                </span>
                <span className="flex w-40 items-center gap-2">
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <span className={`block h-full rounded-full ${c.fill >= 85 ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${c.fill}%` }} />
                  </span>
                  <span className="w-9 text-right tabular-nums">{c.fill}%</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">Más del 85 % (en naranja) quiere decir que se llena: puede convenir sumar otro horario.</p>
      </section>

      <section className="space-y-2 rounded-xl border p-4">
        <h2 className="font-semibold">Clientes por plan</h2>
        {r.plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no cargaste planes de pago.</p>
        ) : (
          <>
            <ul className="divide-y text-sm">
              {r.plans.map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate font-medium">{p.name}</span>
                  <span className="shrink-0 text-right tabular-nums">
                    {p.clients} {p.clients === 1 ? 'cliente' : 'clientes'}
                    {p.monthly !== null ? <span className="block text-xs text-muted-foreground">{formatMoney(p.monthly, r.currency)} por mes</span> : null}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {r.noPlan} {r.noPlan === 1 ? 'cliente sin plan' : 'clientes sin plan'}. {planTotal > 0 ? `Con los precios de tus planes, tus cuotas suman unos ${formatMoney(planTotal, r.currency)} por mes.` : ''}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
