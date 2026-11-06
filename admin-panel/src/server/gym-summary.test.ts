import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./db', () => ({ prisma: {} }));
vi.mock('./alerts', () => ({ sendMail: async () => true }));
vi.mock('./gym-finance', () => ({ getFinance: async () => null }));

import { buildFinance } from '@/features/owner/finance';
import { buildMonthlySummary, monthName, runMonthlySummaries } from './gym-summary';

describe('resumen mensual', () => {
  // Día 1 de noviembre: se cuenta octubre.
  const f = buildFinance({
    today: '2026-11-01',
    clients: [
      { name: 'Ana', feeAmount: 20000, status: 'OVERDUE', daysLeft: -2, createdOn: '2026-10-15' },
      { name: 'Luis', feeAmount: 20000, status: 'OK', daysLeft: 20, createdOn: '2026-01-01' },
    ],
    payments: [
      { paidOn: '2026-10-03', amount: 20000, clientName: 'Luis', months: 1 },
      { paidOn: '2026-10-10', amount: 30000, clientName: 'Ana', months: 1 },
      { paidOn: '2026-09-05', amount: 25000, clientName: 'Luis', months: 1 },
    ],
  });

  it('cuenta el mes que se cierra, no el que empieza', () => {
    const m = buildMonthlySummary({ gymName: 'Gym Norte', f, forzaMembers: 3 });
    expect(m.subject).toBe('Resumen de octubre · Gym Norte');
    expect(m.text).toContain('Cobrado: $50.000 en 2 pagos');
    expect(m.text).toContain('Contra septiembre ($25.000): +100%');
    expect(m.text).toContain('Falta cobrar hoy: $20.000 (1 cliente)');
    expect(m.text).toContain('Con Forza AI activo: 3');
    expect(m.html).toContain('panel.forzaai.app/gym/cobros');
  });

  it('sin socios con Forza AI no menciona la línea', () => {
    expect(buildMonthlySummary({ gymName: 'G', f, forzaMembers: 0 }).text).not.toContain('Con Forza AI');
  });

  it('nombres de mes en español', () => {
    expect(monthName('2026-10')).toBe('octubre');
    expect(monthName('2026-01')).toBe('enero');
  });

  it('solo corre el día 1 del mes', async () => {
    expect(await runMonthlySummaries('2026-11-06')).toEqual({ ran: false, sent: 0 });
  });
});
