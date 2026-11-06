import { describe, expect, it } from 'vitest';
import { buildFinance, money, monthLabel, shiftMonth, type ClientLite, type PaymentLite } from './finance';

const client = (o: Partial<ClientLite> = {}): ClientLite => ({ name: 'Ana', feeAmount: 20000, status: 'OK', daysLeft: 20, createdOn: '2026-01-01', ...o });
const pay = (paidOn: string, amount: number | null, o: Partial<PaymentLite> = {}): PaymentLite => ({ paidOn, amount, clientName: 'Ana', months: 1, ...o });

describe('meses', () => {
  it('shiftMonth cruza el año', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-11', 2)).toBe('2027-01');
    expect(shiftMonth('2026-11', -5)).toBe('2026-06');
  });
  it('monthLabel en español', () => {
    expect(monthLabel('2026-11')).toMatch(/^Nov/);
  });
});

describe('buildFinance', () => {
  const today = '2026-11-06';

  it('suma lo cobrado este mes y compara con el anterior', () => {
    const f = buildFinance({ today, clients: [], payments: [pay('2026-11-02', 20000), pay('2026-11-05', 30000), pay('2026-10-20', 25000), pay('2026-09-01', 10000)] });
    expect(f.collectedThisMonth).toBe(50000);
    expect(f.paymentsThisMonth).toBe(2);
    expect(f.collectedLastMonth).toBe(25000);
    expect(f.deltaPct).toBe(100);
  });

  it('sin cobros el mes anterior no hay porcentaje', () => {
    expect(buildFinance({ today, clients: [], payments: [pay('2026-11-02', 100)] }).deltaPct).toBeNull();
  });

  it('un pago sin importe cuenta como pago pero no suma plata', () => {
    const f = buildFinance({ today, clients: [], payments: [pay('2026-11-02', null), pay('2026-11-03', 100)] });
    expect(f.collectedThisMonth).toBe(100);
    expect(f.paymentsThisMonth).toBe(2);
    expect(f.paymentsWithoutAmount).toBe(1);
  });

  it('la historia trae los últimos 6 meses, de más viejo a más nuevo', () => {
    const f = buildFinance({ today, clients: [], payments: [pay('2026-06-10', 5), pay('2026-11-01', 7), pay('2026-05-31', 99)] });
    expect(f.history.map((h) => h.month)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
    expect(f.history[0]!.collected).toBe(5);
    expect(f.history[5]!.collected).toBe(7);
  });

  it('separa lo que hay que cobrar ya de lo que vence esta semana', () => {
    const f = buildFinance({
      today,
      clients: [
        client({ name: 'Hoy', status: 'DUE_TODAY', daysLeft: 0 }),
        client({ name: 'Tarde', status: 'OVERDUE', daysLeft: -3, feeAmount: 30000 }),
        client({ name: 'Sin plata', status: 'LAPSED', daysLeft: -9, feeAmount: null }),
        client({ name: 'Pronto', status: 'SOON', daysLeft: 4, feeAmount: 10000 }),
        client({ name: 'Bien', status: 'OK' }),
      ],
      payments: [],
    });
    expect(f.pending.count).toBe(3);
    expect(f.pending.amount).toBe(50000);
    expect(f.pending.top[0]).toEqual({ name: 'Sin plata', amount: null, daysLate: 9 });
    expect(f.soon).toEqual({ count: 1, amount: 10000 });
    expect(f.monthlyBase).toBe(20000 + 30000 + 10000 + 20000);
    expect(f.clientsWithoutFee).toBe(1);
  });

  it('cuenta los clientes cargados en los últimos 30 días', () => {
    const f = buildFinance({ today, clients: [client({ createdOn: '2026-10-20' }), client({ createdOn: '2026-08-01' })], payments: [] });
    expect(f.newClients30).toBe(1);
  });
});

describe('money', () => {
  it('pesos sin decimales y con punto de miles', () => {
    expect(money(25000)).toBe('$25.000');
    expect(money(0)).toBe('$0');
  });
});
