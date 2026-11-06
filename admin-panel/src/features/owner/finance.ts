import type { FeeStatus } from '@/features/gym/fees';

/**
 * Números de plata de un gimnasio, calculados con lo que el dueño ya cargó (clientes y pagos de cuotas).
 * Función pura: sin base de datos, se prueba sola.
 */

export interface PaymentLite {
  /** yyyy-mm-dd */
  paidOn: string;
  amount: number | null;
  clientName: string;
  months: number;
}

export interface ClientLite {
  name: string;
  feeAmount: number | null;
  status: FeeStatus;
  daysLeft: number | null;
  /** yyyy-mm-dd en que se cargó. */
  createdOn: string;
}

export interface MonthTotal {
  /** yyyy-mm */
  month: string;
  label: string;
  collected: number;
  payments: number;
}

export interface Finance {
  month: string;
  collectedThisMonth: number;
  paymentsThisMonth: number;
  collectedLastMonth: number;
  /** Cambio contra el mes anterior, en %. Null si el mes anterior fue cero. */
  deltaPct: number | null;
  /** Lo que factura por mes con los clientes activos que tienen cuota cargada. */
  monthlyBase: number;
  clientsWithoutFee: number;
  pending: { count: number; amount: number; top: Array<{ name: string; amount: number | null; daysLate: number }> };
  soon: { count: number; amount: number };
  newClients30: number;
  clients: number;
  history: MonthTotal[];
  recent: PaymentLite[];
  /** Pagos del mes cargados sin importe (cuentan como pago pero no suman plata). */
  paymentsWithoutAmount: number;
}

export const monthOf = (iso: string): string => iso.slice(0, 7);

/** yyyy-mm desplazado n meses. */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const txt = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('es-AR', { month: 'short', timeZone: 'UTC' }).replace('.', '');
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

const sum = (xs: Array<number | null>) => xs.reduce<number>((a, b) => a + (b ?? 0), 0);

export function buildFinance(args: { today: string; clients: ClientLite[]; payments: PaymentLite[] }): Finance {
  const { today, clients, payments } = args;
  const month = monthOf(today);
  const lastMonth = shiftMonth(month, -1);

  const inMonth = (m: string) => payments.filter((p) => monthOf(p.paidOn) === m);
  const thisMonth = inMonth(month);
  const collectedThisMonth = sum(thisMonth.map((p) => p.amount));
  const collectedLastMonth = sum(inMonth(lastMonth).map((p) => p.amount));

  const history: MonthTotal[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const m = shiftMonth(month, -i);
    const list = inMonth(m);
    history.push({ month: m, label: monthLabel(m), collected: sum(list.map((p) => p.amount)), payments: list.length });
  }

  const late = clients.filter((c) => c.status === 'DUE_TODAY' || c.status === 'OVERDUE' || c.status === 'LAPSED');
  const soon = clients.filter((c) => c.status === 'SOON');
  const cutoff30 = new Date(Date.parse(`${today}T00:00:00Z`) - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    month,
    collectedThisMonth,
    paymentsThisMonth: thisMonth.length,
    collectedLastMonth,
    deltaPct: collectedLastMonth > 0 ? Math.round(((collectedThisMonth - collectedLastMonth) / collectedLastMonth) * 100) : null,
    monthlyBase: sum(clients.map((c) => c.feeAmount)),
    clientsWithoutFee: clients.filter((c) => c.feeAmount === null).length,
    pending: {
      count: late.length,
      amount: sum(late.map((c) => c.feeAmount)),
      top: [...late]
        .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
        .slice(0, 10)
        .map((c) => ({ name: c.name, amount: c.feeAmount, daysLate: Math.max(0, -(c.daysLeft ?? 0)) })),
    },
    soon: { count: soon.length, amount: sum(soon.map((c) => c.feeAmount)) },
    newClients30: clients.filter((c) => c.createdOn >= cutoff30).length,
    clients: clients.length,
    history,
    recent: [...payments].sort((a, b) => b.paidOn.localeCompare(a.paidOn)).slice(0, 15),
    paymentsWithoutAmount: thisMonth.filter((p) => p.amount === null).length,
  };
}

/** $ 25.000 (pesos, sin decimales). */
export const money = (n: number): string => `$${Math.round(n).toLocaleString('es-AR')}`;
