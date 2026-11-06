import { describe, expect, it, vi } from 'vitest';

// El módulo importa 'server-only' y la base; para probar la lógica pura se reemplazan por nada.
vi.mock('server-only', () => ({}));
vi.mock('./db', () => ({ prisma: {} }));

import { amountFor, dueDateOf, isOverdue, periodOf, totalsOf, type PaymentRow } from './gym-billing';

describe('cobros a gimnasios', () => {
  it('el mes se toma en horario de Argentina (UTC-3)', () => {
    // 1 de noviembre a las 01:00 UTC todavía es 31 de octubre en Argentina.
    expect(periodOf(new Date('2026-11-01T01:00:00Z'))).toBe('2026-10');
    expect(periodOf(new Date('2026-11-01T03:30:00Z'))).toBe('2026-11');
  });

  it('vence el día 10 del mes que se cobra', () => {
    expect(dueDateOf('2026-11').toISOString().slice(0, 10)).toBe('2026-11-10');
  });

  it('el monto es socios por precio, con dos decimales', () => {
    expect(amountFor(120, 1.5)).toBe(180);
    expect(amountFor(3, 0.333)).toBe(1);
    expect(amountFor(-5, 1.5)).toBe(0);
  });

  it('un pendiente es vencido recién pasada la fecha', () => {
    const due = new Date('2026-11-10T00:00:00Z');
    expect(isOverdue('PENDING', due, new Date('2026-11-10T00:00:00Z'))).toBe(false);
    expect(isOverdue('PENDING', due, new Date('2026-11-11T00:00:00Z'))).toBe(true);
    expect(isOverdue('PAID', due, new Date('2026-12-01T00:00:00Z'))).toBe(false);
  });

  it('suma lo vencido, lo pendiente y lo cobrado este mes', () => {
    const base = { gymId: 'g', gymName: 'G', period: '2026-11', members: 10, pricePerMember: 1.5, currency: 'USD' as const, dueDate: '2026-11-10', note: null };
    const rows: PaymentRow[] = [
      { ...base, id: '1', amount: 100, status: 'PENDING', overdue: true, paidAt: null },
      { ...base, id: '2', amount: 50, status: 'PENDING', overdue: false, paidAt: null },
      { ...base, id: '3', amount: 70, status: 'PAID', overdue: false, paidAt: '2026-11-05T12:00:00Z' },
      { ...base, id: '4', amount: 999, status: 'PAID', overdue: false, paidAt: '2026-10-05T12:00:00Z' },
    ];
    expect(totalsOf(rows, new Date('2026-11-20T12:00:00Z'))).toEqual({
      overdueCount: 1,
      overdue: { ARS: 0, USD: 100 },
      pending: { ARS: 0, USD: 150 },
      collectedThisMonth: { ARS: 0, USD: 70 },
    });
  });

  it('nunca mezcla pesos con dólares: cada moneda va aparte', () => {
    const base = { gymId: 'g', gymName: 'G', period: '2026-11', members: 8, pricePerMember: 5000, dueDate: '2026-11-10', note: null };
    const rows: PaymentRow[] = [
      { ...base, id: '1', currency: 'ARS', amount: 40000, status: 'PENDING', overdue: true, paidAt: null },
      { ...base, id: '2', currency: 'USD', amount: 12, status: 'PENDING', overdue: true, paidAt: null },
      { ...base, id: '3', currency: 'ARS', amount: 25000, status: 'PAID', overdue: false, paidAt: '2026-11-05T12:00:00Z' },
    ];
    expect(totalsOf(rows, new Date('2026-11-20T12:00:00Z'))).toEqual({
      overdueCount: 2,
      overdue: { ARS: 40000, USD: 12 },
      pending: { ARS: 40000, USD: 12 },
      collectedThisMonth: { ARS: 25000, USD: 0 },
    });
  });
});
