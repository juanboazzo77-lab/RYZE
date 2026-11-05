import { describe, expect, it } from 'vitest';
import { buildDigest } from './digest';
import type { TodaySummary } from './admin-hub';

const empty: TodaySummary = {
  generatedAt: '2026-11-06T12:00:00Z',
  users: { new24h: 2, new7d: 10, total: 100 },
  subscribers: { new7d: 1, pastDue: 0, total: 5 },
  errors: { open: 0, last24h: 0, recent: [] },
  gyms: { pending: [], active: 2, full: 0, members: 80 },
  billing: { overdueCount: 0, overdueUsd: 0, pendingUsd: 120, collectedThisMonthUsd: 60 },
  overdue: [],
};

describe('resumen diario', () => {
  it('sin nada urgente lo dice en el asunto', () => {
    const d = buildDigest(empty);
    expect(d.urgent).toBe(0);
    expect(d.subject).toContain('nada urgente');
    expect(d.text).toContain('Nada urgente hoy.');
    expect(d.text).not.toContain('COBROS VENCIDOS');
  });

  it('cuenta y lista lo urgente', () => {
    const d = buildDigest({
      ...empty,
      gyms: { ...empty.gyms, pending: [{ id: '1', name: 'Gym Norte', city: 'Hudson', createdAt: '2026-11-05T00:00:00Z' }] },
      billing: { ...empty.billing, overdueCount: 1, overdueUsd: 180 },
      overdue: [{ id: 'p', gymName: 'Gym Sur', period: '2026-11', amountUsd: 180, dueDate: '2026-11-10' }],
      errors: { open: 3, last24h: 2, recent: [{ id: 'e', message: 'Boom', path: 'GET /x', count: 4, lastSeen: '2026-11-06T10:00:00Z' }] },
      subscribers: { ...empty.subscribers, pastDue: 1 },
    });
    expect(d.urgent).toBe(5);
    expect(d.subject).toContain('5 para mirar');
    expect(d.text).toContain('Gym Norte (Hudson)');
    expect(d.text).toContain('Gym Sur, 2026-11: US$ 180');
    expect(d.text).toContain('Boom · GET /x · 4 veces');
    expect(d.text).toContain('PAGO FALLIDO (1)');
  });

  it('avisa si hay gimnasios con el cupo lleno', () => {
    const d = buildDigest({ ...empty, gyms: { ...empty.gyms, full: 1 } });
    expect(d.text).toContain('1 con el cupo lleno');
  });
});
