import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, QrCode } from 'lucide-react';
import { requireOwnerPage } from '@/lib/owner';
import { getFinance } from '@/server/gym-finance';
import { money, monthLabel } from '@/features/owner/finance';

export const metadata: Metadata = { title: 'Cobros' };
export const dynamic = 'force-dynamic';

function Stat({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${alert ? 'border-warning/50 bg-warning/10' : ''}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** La plata del gimnasio: lo cobrado, lo que falta cobrar y cómo viene mes a mes. */
export default async function GymFinancePage() {
  const owner = await requireOwnerPage();
  const f = await getFinance(owner.userId, owner.gym.id);
  if (!f) return null;
  const max = Math.max(1, ...f.history.map((h) => h.collected));
  const delta = f.deltaPct === null ? undefined : `${f.deltaPct >= 0 ? '+' : ''}${f.deltaPct}% contra ${monthLabel(f.history[4]!.month)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cobros</h1>
          <p className="text-xs text-muted-foreground">Con los pagos que anotás en Clientes con el botón Pagó.</p>
        </div>
        <div className="flex flex-wrap gap-2">
        <Link
          href="/gym/cobros/qr"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <QrCode className="size-4" />
          QR de cobro
        </Link>
        <a
          href="/gym/cobros/export"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <Download className="size-4" />
          Bajar a Excel
        </a>
        </div>
      </div>

      {f.clients === 0 ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">
          Todavía no cargaste clientes. Cargalos en{' '}
          <Link href="/gym/clientes" className="underline">
            Clientes
          </Link>{' '}
          y anotá los pagos: acá vas a ver cuánto cobraste y cuánto te falta.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={`Cobrado en ${monthLabel(f.month)}`} value={money(f.collectedThisMonth)} sub={delta ?? `${f.paymentsThisMonth} ${f.paymentsThisMonth === 1 ? 'pago' : 'pagos'}`} />
            <Stat label="Falta cobrar ya" value={money(f.pending.amount)} sub={`${f.pending.count} ${f.pending.count === 1 ? 'cliente' : 'clientes'}`} alert={f.pending.count > 0} />
            <Stat label="Vencen esta semana" value={money(f.soon.amount)} sub={`${f.soon.count} ${f.soon.count === 1 ? 'cliente' : 'clientes'}`} />
            <Stat label="Facturación por mes" value={money(f.monthlyBase)} sub={f.clientsWithoutFee > 0 ? `${f.clientsWithoutFee} sin cuota cargada` : `${f.clients} clientes`} />
          </div>

          {f.paymentsWithoutAmount > 0 ? (
            <p className="text-xs text-muted-foreground">
              {f.paymentsWithoutAmount} {f.paymentsWithoutAmount === 1 ? 'pago de este mes no tiene importe' : 'pagos de este mes no tienen importe'}: cargale la cuota al cliente (en Clientes → Más) para que los próximos sumen.
            </p>
          ) : null}

          <section className="space-y-2">
            <h2 className="text-base font-semibold">Mes a mes</h2>
            <div className="flex items-end gap-2 rounded-xl border p-3" role="img" aria-label="Cobrado en los últimos 6 meses">
              {f.history.map((h) => (
                <div key={h.month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] tabular-nums text-muted-foreground">{h.collected > 0 ? money(h.collected) : '–'}</span>
                  <div className="flex h-24 w-full items-end">
                    <div className="w-full rounded-t bg-primary" style={{ height: `${Math.max(h.collected > 0 ? 4 : 0, (h.collected / max) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{h.label}</span>
                </div>
              ))}
            </div>
          </section>

          {f.pending.top.length > 0 ? (
            <section className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">A quién cobrarle</h2>
                <Link href="/gym/clientes?f=cobrar" className="text-xs text-muted-foreground underline hover:text-foreground">
                  Ver en Clientes
                </Link>
              </div>
              <ul className="divide-y rounded-xl border">
                {f.pending.top.map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <span className="min-w-0 truncate font-medium">{c.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {c.daysLate === 0 ? 'vence hoy' : `hace ${c.daysLate} ${c.daysLate === 1 ? 'día' : 'días'}`}
                      {c.amount !== null ? ` · ${money(c.amount)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-2">
            <h2 className="text-base font-semibold">Últimos pagos</h2>
            {f.recent.length === 0 ? (
              <p className="rounded-xl border p-3 text-sm text-muted-foreground">Todavía no anotaste ningún pago.</p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {f.recent.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <span className="min-w-0 truncate">
                      {p.clientName}
                      {p.months > 1 ? <span className="text-xs text-muted-foreground"> · {p.months} meses</span> : null}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {fmtDay(p.paidOn)} · {p.amount !== null ? money(p.amount) : 'sin importe'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
