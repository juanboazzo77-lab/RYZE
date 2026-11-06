import 'server-only';
import { prisma } from './db';
import { listClients } from './gym-clients';
import { todayArgentina } from './gym-fees';
import { buildFinance, shiftMonth, monthOf, type Finance, type PaymentLite } from '@/features/owner/finance';

const isoOf = (d: Date) => d.toISOString().slice(0, 10);

/** Pagos de cuotas de un gimnasio desde `sinceISO` (yyyy-mm-dd), del más nuevo al más viejo. */
async function loadPayments(gymId: string, sinceISO: string): Promise<PaymentLite[]> {
  const rows = await prisma.gymClientPayment.findMany({
    where: { client: { gymId }, paidOn: { gte: new Date(`${sinceISO}T00:00:00.000Z`) } },
    orderBy: { paidOn: 'desc' },
    take: 5000,
    select: { paidOn: true, amount: true, months: true, client: { select: { name: true } } },
  });
  return rows.map((r) => ({ paidOn: isoOf(r.paidOn), amount: r.amount === null ? null : Number(r.amount), months: r.months, clientName: r.client.name }));
}

/** Los números de plata del gimnasio. Null si esa cuenta no es la dueña. */
export async function getFinance(ownerUserId: string, gymId: string, today = todayArgentina()): Promise<Finance | null> {
  const clients = await listClients(ownerUserId, gymId, today);
  if (!clients) return null;
  const since = `${shiftMonth(monthOf(today), -5)}-01`;
  const created = await prisma.gymClient.findMany({ where: { gymId, active: true }, select: { id: true, createdAt: true } });
  const createdBy = new Map(created.map((c) => [c.id, isoOf(c.createdAt)]));
  const payments = await loadPayments(gymId, since);
  return buildFinance({
    today,
    clients: clients.map((c) => ({ name: c.name, feeAmount: c.feeAmount, status: c.status, daysLeft: c.daysLeft, createdOn: createdBy.get(c.id) ?? today })),
    payments,
  });
}

/** Todos los pagos del último año, para bajar a Excel. */
export async function exportPayments(ownerUserId: string, gymId: string, today = todayArgentina()): Promise<PaymentLite[] | null> {
  const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerUserId }, select: { id: true } });
  if (!gym) return null;
  return loadPayments(gymId, `${shiftMonth(monthOf(today), -11)}-01`);
}

/** Una celda de CSV: entre comillas, y sin que Excel la tome por una fórmula. */
export function csvCell(v: string | number | null): string {
  let s = v === null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function paymentsCsv(payments: PaymentLite[]): string {
  const rows = [['Fecha', 'Cliente', 'Importe', 'Meses'], ...payments.map((p) => [p.paidOn, p.clientName, p.amount, p.months])];
  // BOM + ; como separador: así Excel en español abre bien los acentos y las columnas.
  return `﻿${rows.map((r) => r.map((c) => csvCell(c as string | number | null)).join(';')).join('\r\n')}\r\n`;
}
