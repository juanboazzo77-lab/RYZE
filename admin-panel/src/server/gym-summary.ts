import 'server-only';
import { prisma } from './db';
import { sendMail } from './alerts';
import { composeEmail, type Block, type ComposedEmail } from './email-template';
import { getFinance } from './gym-finance';
import { todayArgentina } from './gym-fees';
import { money, monthLabel, shiftMonth, type Finance } from '@/features/owner/finance';

/**
 * Resumen mensual para el dueño: el día 1 de cada mes le llega por mail cómo le fue el mes anterior (cobrado,
 * comparación, lo que falta cobrar y los clientes nuevos). Lo manda el cron diario del panel.
 */

const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const monthName = (month: string): string => MONTH_NAMES[Number(month.slice(5, 7)) - 1] ?? month;

/** Arma el mail. `f` se calculó el día 1 del mes nuevo, así que el mes que se cuenta es el anterior. Función pura. */
export function buildMonthlySummary(args: { gymName: string; f: Finance; forzaMembers: number; panelUrl?: string }): ComposedEmail {
  const { gymName, f, forzaMembers } = args;
  const panel = (args.panelUrl ?? 'https://panel.forzaai.app').replace(/\/$/, '');
  const prev = shiftMonth(f.month, -1);
  const last = f.history[f.history.length - 2]!; // el mes que se cierra
  const before = f.history[f.history.length - 3]!; // el anterior a ese
  const name = monthName(prev);

  const blocks: Block[] = [{ type: 'p', text: `Así le fue a ${gymName} en ${name}.` }];
  const items = [`Cobrado: ${money(last.collected)} en ${last.payments} ${last.payments === 1 ? 'pago' : 'pagos'}.`];
  if (before.collected > 0) {
    const pct = Math.round(((last.collected - before.collected) / before.collected) * 100);
    items.push(`Contra ${monthName(shiftMonth(prev, -1))} (${money(before.collected)}): ${pct >= 0 ? '+' : ''}${pct}%.`);
  }
  items.push(`Falta cobrar hoy: ${money(f.pending.amount)} (${f.pending.count} ${f.pending.count === 1 ? 'cliente' : 'clientes'}).`);
  items.push(`Clientes cargados: ${f.clients}${f.newClients30 > 0 ? ` (${f.newClients30} nuevos en el último mes)` : ''}.`);
  if (forzaMembers > 0) items.push(`Con Forza AI activo: ${forzaMembers}.`);
  blocks.push({ type: 'list', items });
  if (f.pending.count > 0) blocks.push({ type: 'p', text: 'Todavía quedan cuotas sin cobrar: avisales por WhatsApp desde tu panel.' });
  blocks.push({ type: 'button', label: 'Ver mis cobros', url: `${panel}/gym/cobros` });

  const subject = `Resumen de ${name} · ${gymName}`.slice(0, 150);
  return composeEmail({ subject, preheader: `Cobrado en ${name}: ${money(last.collected)}.`, heading: `Tu resumen de ${name}`, blocks });
}

export interface SummaryRunResult {
  ran: boolean;
  sent: number;
}

/** Solo el día 1 de cada mes (hora de Argentina). Cualquier otro día no hace nada. */
export async function runMonthlySummaries(today = todayArgentina(), panelUrl?: string): Promise<SummaryRunResult> {
  if (!today.endsWith('-01')) return { ran: false, sent: 0 };
  const gyms = await prisma.gym.findMany({
    where: { status: 'ACTIVE', ownerUserId: { not: null }, clients: { some: { active: true } } },
    select: { id: true, name: true, ownerUserId: true, owner: { select: { email: true } } },
  });
  let sent = 0;
  for (const g of gyms) {
    if (!g.ownerUserId || !g.owner?.email) continue;
    try {
      const f = await getFinance(g.ownerUserId, g.id, today);
      if (!f) continue;
      const forzaMembers = await prisma.gymMember.count({ where: { gymId: g.id, status: 'ACTIVE', source: { not: 'WEB' } } });
      const mail = buildMonthlySummary({ gymName: g.name, f, forzaMembers, panelUrl });
      if (await sendMail({ to: g.owner.email, subject: mail.subject, text: mail.text, html: mail.html })) sent += 1;
    } catch (e) {
      // Un gimnasio que falla no frena a los demás.
      console.error('[resumen-mensual]', g.id, e instanceof Error ? e.message : e);
    }
  }
  return { ran: true, sent };
}
