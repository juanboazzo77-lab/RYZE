import type { Metadata } from 'next';
import { requireOwnerPage } from '@/lib/owner';
import { getOwnerBilling } from '@/server/gym-billing-owner';
import { formatMoney, formatMoneyMap } from '@/features/gym/money';
import { monthLabel } from '@/features/owner/finance';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Facturación' };
export const dynamic = 'force-dynamic';

const TRANSFER_FALLBACK = 'Pedinos los datos para transferir escribiendo a gimnasios@forzaai.app.';
const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const periodName = (p: string) => `${monthLabel(p)} ${p.slice(0, 4)}`;

function Stat({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${alert ? 'border-warning/50 bg-warning/10' : ''}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

/** Lo que el gimnasio le paga a Forza AI por sus socios, y cómo pagarlo. */
export default async function GymBillingPage() {
  const owner = await requireOwnerPage();
  const b = await getOwnerBilling(owner.userId, owner.gym.id);
  if (!b) return null;
  const instructions = process.env.GYM_PAYMENT_INSTRUCTIONS || TRANSFER_FALLBACK;
  const hasCurrent = b.rows.some((r) => r.period === b.currentPeriod);
  const overdue = b.rows.some((r) => r.overdue);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lo que pagás a Forza AI</h1>
        <p className="text-sm text-muted-foreground">
          Pagás {formatMoney(b.pricePerMember, b.currency)} por mes por cada socio que usa Forza AI. Se paga por transferencia y vence el día 10 de cada mes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Socios con Forza AI" value={String(b.activeMembers)} sub={`× ${formatMoney(b.pricePerMember, b.currency)} por mes`} />
        <Stat label={`${periodName(b.currentPeriod)} (estimado)`} value={formatMoney(b.estimate, b.currency)} sub={`vence el ${fmtDay(b.estimateDueDate)}`} />
        <Stat label="Pendiente de pago" value={formatMoneyMap(b.pending)} sub={overdue ? 'Hay cobros vencidos' : 'Todo al día'} alert={overdue} />
      </div>

      <section className="space-y-2 rounded-xl border p-4">
        <h2 className="text-base font-semibold">Cómo pagar</h2>
        <p className="whitespace-pre-line text-sm text-muted-foreground">{instructions}</p>
        <p className="text-sm text-muted-foreground">
          Después de transferir, mandá el comprobante a{' '}
          <a className="underline" href="mailto:gimnasios@forzaai.app">
            gimnasios@forzaai.app
          </a>{' '}
          (o por WhatsApp). Lo anotamos como pagado y se actualiza acá.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Tus cobros</h2>
        {b.rows.length === 0 ? (
          <p className="rounded-xl border p-3 text-sm text-muted-foreground">
            Todavía no hay cobros armados. El primero aparece cuando tengas socios con Forza AI.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {b.rows.map((r) => (
              <li key={r.period} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{periodName(r.period)}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.members} {r.members === 1 ? 'socio' : 'socios'} × {formatMoney(r.pricePerMember, r.currency)} · vence el {fmtDay(r.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums">{formatMoney(r.amount, r.currency)}</span>
                  <Badge variant={r.status === 'PAID' ? 'success' : r.overdue ? 'warning' : 'secondary'}>
                    {r.status === 'PAID' ? 'Pagado' : r.overdue ? 'Vencido' : 'Pendiente'}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!hasCurrent && b.activeMembers > 0 ? (
          <p className="text-xs text-muted-foreground">El cobro de {periodName(b.currentPeriod)} se arma en cuanto lo revisamos; el monto puede cambiar si suman o salen socios.</p>
        ) : null}
      </section>
    </div>
  );
}
