import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./db', () => ({ prisma: {} }));

import { buildOwnerReminder, todayArgentina } from './gym-fees';

describe('buildOwnerReminder', () => {
  it('no manda nada si no hay cuotas para cobrar hoy', () => {
    expect(buildOwnerReminder('Gym', [{ name: 'Ana', status: 'OK', daysLeft: 20, fee: null }])).toBeNull();
    expect(buildOwnerReminder('Gym', [{ name: 'Ana', status: 'SOON', daysLeft: 3, fee: null }])).toBeNull();
  });

  it('lista los que vencen hoy y los vencidos', () => {
    const r = buildOwnerReminder('Gym Norte', [
      { name: 'Ana', status: 'DUE_TODAY', daysLeft: 0, fee: 25000 },
      { name: 'Luis', status: 'OVERDUE', daysLeft: -2, fee: null },
      { name: 'Marta', status: 'LAPSED', daysLeft: -9, fee: null },
      { name: 'Pablo', status: 'SOON', daysLeft: 4, fee: null },
    ])!;
    expect(r.dueToday).toBe(1);
    expect(r.overdue).toBe(2);
    expect(r.subject).toContain('3 cuotas para cobrar');
    expect(r.text).toContain('Ana');
    expect(r.text).toContain('hace 2 días');
    expect(r.text).toContain('sin acceso a Forza AI');
    expect(r.text).toContain('Pablo');
  });
});

describe('todayArgentina', () => {
  it('usa la fecha de Argentina, no la de UTC', () => {
    // 02:00 UTC del 7 = 23:00 del 6 en Argentina
    expect(todayArgentina(new Date('2026-11-07T02:00:00Z'))).toBe('2026-11-06');
  });
});
