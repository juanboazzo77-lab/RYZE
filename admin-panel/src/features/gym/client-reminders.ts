/**
 * Recordatorios automáticos de cuota al cliente (por mail). Se manda un aviso 3 días antes del vencimiento, el día que
 * vence y 3 días después si sigue sin pagar, y nunca dos veces el mismo día. Funciones puras.
 */

/** Cuántos días antes (positivo) o después (negativo) del vencimiento se avisa. */
export const REMIND_AT_DAYS = [3, 0, -3] as const;

export function shouldRemind(daysLeft: number | null, lastReminderOn: string | null, today: string): boolean {
  if (daysLeft === null) return false;
  if (lastReminderOn === today) return false;
  return (REMIND_AT_DAYS as readonly number[]).includes(daysLeft);
}

export interface ClientReminderInput {
  clientName: string;
  gymName: string;
  daysLeft: number;
  /** Vencimiento en formato dd/mm. */
  dueLabel: string;
  paymentLink: string | null;
  paymentAlias: string | null;
}

/** El texto del recordatorio: qué pasa con su cuota y cómo pagar (si el gimnasio cargó un link o un alias). */
export function clientReminderText(i: ClientReminderInput): { subject: string; lead: string; howToPay: string | null } {
  const first = i.clientName.trim().split(/\s+/)[0] || '';
  const hello = first ? `Hola ${first}` : 'Hola';
  const d = i.daysLeft;
  const lead =
    d > 0
      ? `${hello}, te recordamos que tu cuota en ${i.gymName} vence en ${d} ${d === 1 ? 'día' : 'días'} (el ${i.dueLabel}).`
      : d === 0
        ? `${hello}, hoy vence tu cuota en ${i.gymName}.`
        : `${hello}, tu cuota en ${i.gymName} venció hace ${-d} ${-d === 1 ? 'día' : 'días'} (el ${i.dueLabel}).`;
  const subject = d > 0 ? `Tu cuota en ${i.gymName} vence el ${i.dueLabel}` : d === 0 ? `Hoy vence tu cuota en ${i.gymName}` : `Tu cuota en ${i.gymName} está vencida`;
  const howToPay = i.paymentLink ? 'Podés pagarla desde el botón de abajo.' : i.paymentAlias ? `Podés transferir al alias ${i.paymentAlias}.` : null;
  return { subject: subject.slice(0, 150), lead, howToPay };
}
