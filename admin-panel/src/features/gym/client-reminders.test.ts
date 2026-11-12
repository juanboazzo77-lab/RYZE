import { describe, expect, it } from 'vitest';
import { clientReminderText, shouldRemind } from './client-reminders';

describe('recordatorios de cuota al cliente', () => {
  it('avisa 3 días antes, el día que vence y 3 días después', () => {
    expect(shouldRemind(3, null, '2026-11-12')).toBe(true);
    expect(shouldRemind(0, null, '2026-11-12')).toBe(true);
    expect(shouldRemind(-3, null, '2026-11-12')).toBe(true);
  });

  it('no avisa los otros días ni sin vencimiento', () => {
    for (const d of [5, 2, 1, -1, -2, -4, -10]) expect(shouldRemind(d, null, '2026-11-12')).toBe(false);
    expect(shouldRemind(null, null, '2026-11-12')).toBe(false);
  });

  it('nunca dos veces el mismo día', () => {
    expect(shouldRemind(0, '2026-11-12', '2026-11-12')).toBe(false);
    expect(shouldRemind(0, '2026-11-11', '2026-11-12')).toBe(true);
  });

  it('el texto cambia según los días y dice cómo pagar', () => {
    const base = { clientName: 'Ana Pérez', gymName: 'Iron Gym', dueLabel: '15/11', paymentLink: null, paymentAlias: 'iron.gym' };
    expect(clientReminderText({ ...base, daysLeft: 3 }).lead).toBe('Hola Ana, te recordamos que tu cuota en Iron Gym vence en 3 días (el 15/11).');
    expect(clientReminderText({ ...base, daysLeft: 0 }).subject).toBe('Hoy vence tu cuota en Iron Gym');
    expect(clientReminderText({ ...base, daysLeft: -3 }).lead).toContain('venció hace 3 días');
    expect(clientReminderText({ ...base, daysLeft: 3 }).howToPay).toBe('Podés transferir al alias iron.gym.');
    expect(clientReminderText({ ...base, paymentLink: 'https://mpago.la/x', daysLeft: 3 }).howToPay).toBe('Podés pagarla desde el botón de abajo.');
    expect(clientReminderText({ ...base, paymentAlias: null, daysLeft: 3 }).howToPay).toBeNull();
  });
});
