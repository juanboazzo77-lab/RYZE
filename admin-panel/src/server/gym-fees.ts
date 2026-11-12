import 'server-only';
import { prisma } from './db';
import { sendMail } from './alerts';
import { composeEmail, type Block } from './email-template';
import { daysBetween, feeStatus, type FeeStatus } from '@/features/gym/fees';
import { clientReminderText, shouldRemind } from '@/features/gym/client-reminders';

/**
 * Control de cuotas de los clientes de cada gimnasio (lo carga el gimnasio en su panel). Corre una vez por
 * día desde el cron: avisa al dueño a quién le toca pagar y quita el acceso a Forza AI a quien lleva
 * demasiados días sin pagar la cuota del gimnasio.
 */

export const GYM_TZ = 'America/Argentina/Buenos_Aires';

/** Fecha de hoy (yyyy-mm-dd) en Argentina. */
export function todayArgentina(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: GYM_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

interface Line {
  name: string;
  status: FeeStatus;
  daysLeft: number;
  fee: number | null;
}

export interface OwnerReminder {
  subject: string;
  text: string;
  html: string;
  dueToday: number;
  overdue: number;
}

/** Arma el mail para el dueño. Devuelve null si no hay nada para cobrar hoy. Función pura. */
export function buildOwnerReminder(gymName: string, lines: Line[], panelUrl = 'https://panel.forzaai.app'): OwnerReminder | null {
  const today = lines.filter((l) => l.status === 'DUE_TODAY');
  const late = lines.filter((l) => l.status === 'OVERDUE' || l.status === 'LAPSED').sort((a, b) => a.daysLeft - b.daysLeft);
  const soon = lines.filter((l) => l.status === 'SOON');
  if (today.length === 0 && late.length === 0) return null;

  const money = (l: Line) => (l.fee !== null ? ` · $${l.fee.toLocaleString('es-AR')}` : '');
  const dias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;
  const blocks: Block[] = [{ type: 'p', text: `Este es el resumen de cuotas de ${gymName}.` }];
  if (today.length > 0) {
    blocks.push({ type: 'p', text: `Hoy tienen que pagar (${today.length}):` }, { type: 'list', items: today.map((l) => `${l.name}${money(l)}`) });
  }
  if (late.length > 0) {
    blocks.push(
      { type: 'p', text: `Cuotas vencidas (${late.length}):` },
      { type: 'list', items: late.map((l) => `${l.name}${money(l)} · hace ${dias(-l.daysLeft)}${l.status === 'LAPSED' ? ' (sin acceso a Forza AI)' : ''}`) },
    );
  }
  if (soon.length > 0) {
    const items = soon.slice(0, 15).map((l) => `${l.name}${money(l)} · en ${dias(l.daysLeft)}`);
    if (soon.length > 15) items.push(`y ${soon.length - 15} más`);
    blocks.push({ type: 'p', text: `Vencen esta semana (${soon.length}):` }, { type: 'list', items });
  }
  blocks.push(
    { type: 'button', label: 'Abrir mis clientes', url: `${panelUrl.replace(/\/$/, '')}/gym/clientes` },
    { type: 'note', text: 'Cuando te paguen, tocá "Pagó" en cada cliente: el vencimiento se corre solo.' },
  );
  const count = today.length + late.length;
  const subject = `${count} ${count === 1 ? 'cuota para cobrar' : 'cuotas para cobrar'} hoy en ${gymName}`.slice(0, 150);
  const mail = composeEmail({ subject, preheader: 'Quién vence hoy y quién está atrasado.', heading: 'Cuotas para cobrar hoy', blocks });
  return { subject: mail.subject, text: mail.text, html: mail.html, dueToday: today.length, overdue: late.length };
}

export interface FeeRunResult {
  gyms: number;
  mailsSent: number;
  lapsed: number;
  /** Recordatorios de cuota mandados a clientes. */
  clientMails: number;
}

/** Corre el control diario de cuotas de todos los gimnasios activos. */
export async function runDailyFees(today = todayArgentina(), panelUrl?: string): Promise<FeeRunResult> {
  const gyms = await prisma.gym.findMany({
    where: { status: 'ACTIVE', clients: { some: { active: true, paidUntil: { not: null } } } },
    select: {
      id: true,
      name: true,
      owner: { select: { email: true } },
      clientReminders: true,
      paymentLink: true,
      paymentAlias: true,
      clients: { where: { active: true, paidUntil: { not: null } }, select: { id: true, name: true, email: true, paidUntil: true, feeAmount: true, lastReminderOn: true } },
    },
  });

  let mailsSent = 0;
  let lapsed = 0;
  let clientMails = 0;
  for (const g of gyms) {
    const lines: Line[] = [];
    const lapsedEmails: string[] = [];
    for (const c of g.clients) {
      const paidUntil = c.paidUntil!.toISOString().slice(0, 10);
      const status = feeStatus(paidUntil, today);
      lines.push({ name: c.name, status, daysLeft: daysBetween(today, paidUntil), fee: c.feeAmount === null ? null : Number(c.feeAmount) });
      if (status === 'LAPSED' && c.email) lapsedEmails.push(c.email);
    }

    // Quien lleva demasiado sin pagar la cuota del gimnasio pierde el acceso a Forza AI (lo recupera cuando el gimnasio anota su pago).
    if (lapsedEmails.length > 0) {
      const res = await prisma.gymMember.updateMany({
        where: { gymId: g.id, status: 'ACTIVE', source: { notIn: ['WEB', 'CODE'] }, user: { email: { in: lapsedEmails, mode: 'insensitive' } } },
        data: { status: 'LAPSED' },
      });
      lapsed += res.count;
    }

    // Recordatorios al cliente (solo si el dueño los prendió): 3 días antes, el día que vence y 3 días después.
    if (g.clientReminders) {
      for (const c of g.clients) {
        if (!c.email || !/^[^s@]+@[^s@]+.[^s@]{2,}$/.test(c.email)) continue;
        const paidUntil = c.paidUntil!.toISOString().slice(0, 10);
        const daysLeft = daysBetween(today, paidUntil);
        if (!shouldRemind(daysLeft, c.lastReminderOn ? c.lastReminderOn.toISOString().slice(0, 10) : null, today)) continue;
        const t = clientReminderText({ clientName: c.name, gymName: g.name, daysLeft, dueLabel: paidUntil.slice(8, 10) + '/' + paidUntil.slice(5, 7), paymentLink: g.paymentLink, paymentAlias: g.paymentAlias });
        const mail = composeEmail({
          subject: t.subject,
          preheader: t.lead,
          heading: 'Tu cuota',
          blocks: [
            { type: 'p', text: t.lead },
            ...(t.howToPay ? [{ type: 'p' as const, text: t.howToPay }] : []),
            ...(g.paymentLink ? [{ type: 'button' as const, label: 'Pagar mi cuota', url: g.paymentLink }] : []),
            { type: 'note', text: `Si ya pagaste, ignorá este mensaje. Te lo manda ${g.name}, que tiene tu mail en su lista de clientes.` },
          ],
        });
        if (await sendMail({ to: c.email, subject: mail.subject, text: mail.text, html: mail.html })) {
          clientMails += 1;
          await prisma.gymClient.update({ where: { id: c.id }, data: { lastReminderOn: new Date(`${today}T00:00:00.000Z`) } });
        }
      }
    }

    const reminder = buildOwnerReminder(g.name, lines, panelUrl);
    if (reminder && g.owner?.email && (await sendMail({ to: g.owner.email, subject: reminder.subject, text: reminder.text, html: reminder.html }))) mailsSent += 1;
  }
  return { gyms: gyms.length, mailsSent, lapsed, clientMails };
}
