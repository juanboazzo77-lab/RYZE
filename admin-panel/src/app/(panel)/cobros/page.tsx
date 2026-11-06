import type { Metadata } from 'next';
import { prisma } from '@/server/db';
import { ensureCurrentPayments, listPayments, totalsOf, DUE_DAY } from '@/server/gym-billing';
import { Badge } from '@/components/ui/badge';
import { Kpi } from '@/features/admin/ui';
import { asCurrency, formatMoney, formatMoneyMap } from '@/features/gym/money';
import { PaidButton, PriceEditor } from '@/features/admin/payment-controls';

export const metadata: Metadata = { title: 'Cobros', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminBillingPage() {
  await ensureCurrentPayments();
  const [payments, gyms] = await Promise.all([
    listPayments(),
    prisma.gym.findMany({
      where: { status: { in: ['ACTIVE', 'SUSPENDED'] } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, status: true, pricePerMember: true, currency: true },
    }),
  ]);
  const t = totalsOf(payments);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cobros a gimnasios</h1>
        <p className="text-xs text-muted-foreground">
          Cada mes se arma un cobro por gimnasio: socios que entraron con su código × precio por socio. Vence el día {DUE_DAY}. El cobro en sí lo hacés por transferencia; acá lo marcás como pagado.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi label="Vencido" value={formatMoneyMap(t.overdue)} sub={`${t.overdueCount} cobros`} tone={t.overdueCount > 0 ? 'alert' : 'good'} />
        <Kpi label="Por cobrar (todo)" value={formatMoneyMap(t.pending)} />
        <Kpi label="Cobrado este mes" value={formatMoneyMap(t.collectedThisMonth)} tone="good" />
      </div>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Cobros</h2>
        {payments.length === 0 ? (
          <p className="rounded-xl border p-4 text-sm text-muted-foreground">
            Todavía no hay cobros. Aparecen solos cuando un gimnasio activo tiene socios.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {p.gymName} <span className="font-normal text-muted-foreground">· {p.period}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.members} socios × {formatMoney(p.pricePerMember, p.currency)} · vence {p.dueDate}
                    {p.paidAt ? ` · pagado ${new Date(p.paidAt).toLocaleDateString('es-AR')}` : ''}
                    {p.note ? ` · ${p.note}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold tabular-nums">{formatMoney(p.amount, p.currency)}</span>
                  {p.overdue ? <Badge variant="warning">Vencido</Badge> : p.status === 'PAID' ? <Badge variant="success">Pagado</Badge> : <Badge variant="secondary">Pendiente</Badge>}
                  <PaidButton id={p.id} paid={p.status === 'PAID'} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Precio por socio</h2>
        <p className="text-xs text-muted-foreground">US$ por socio por mes. Cambia los cobros pendientes; los ya pagados quedan como estaban.</p>
        {gyms.length === 0 ? (
          <p className="rounded-xl border p-4 text-sm text-muted-foreground">No hay gimnasios aprobados todavía.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {gyms.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                <span className="min-w-0 truncate font-medium">
                  {g.name}
                  {g.status === 'SUSPENDED' ? <span className="font-normal text-muted-foreground"> · suspendido</span> : null}
                </span>
                <PriceEditor gymId={g.id} price={Number(g.pricePerMember)} currency={asCurrency(g.currency)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
