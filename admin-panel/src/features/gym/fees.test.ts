import { describe, expect, it } from 'vitest';
import { addDays, addMonths, daysBetween, feeRank, feeStatus, nextPaidUntil, parseClientLines } from './fees';

describe('fechas de cuotas', () => {
  it('suma meses calendario sin pasarse del fin de mes', () => {
    expect(addMonths('2026-11-12', 1)).toBe('2026-12-12');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('cuenta días entre fechas', () => {
    expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7);
    expect(daysBetween('2026-11-08', '2026-11-01')).toBe(-7);
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  });
});

describe('hasta cuándo queda pagado', () => {
  it('el primer pago cuenta desde el día del pago', () => {
    expect(nextPaidUntil(null, '2026-11-10')).toBe('2026-12-10');
  });

  it('pagando a tiempo se cuenta desde el vencimiento anterior (no se pierden días)', () => {
    expect(nextPaidUntil('2026-11-12', '2026-11-10')).toBe('2026-12-12');
    expect(nextPaidUntil('2026-11-12', '2026-11-12')).toBe('2026-12-12');
  });

  it('pagando tarde se cuenta desde el día del pago', () => {
    expect(nextPaidUntil('2026-11-01', '2026-11-10')).toBe('2026-12-10');
  });

  it('puede pagar varios meses juntos', () => {
    expect(nextPaidUntil('2026-11-12', '2026-11-10', 3)).toBe('2027-02-12');
  });
});

describe('estado de la cuota', () => {
  const today = '2026-11-10';

  it('sin fecha es un cliente nuevo', () => {
    expect(feeStatus(null, today)).toBe('NEW');
  });

  it('al día, por vencer, vence hoy y vencida', () => {
    expect(feeStatus('2026-11-30', today)).toBe('OK');
    expect(feeStatus('2026-11-17', today)).toBe('SOON');
    expect(feeStatus('2026-11-11', today)).toBe('SOON');
    expect(feeStatus('2026-11-10', today)).toBe('DUE_TODAY');
    expect(feeStatus('2026-11-09', today)).toBe('OVERDUE');
  });

  it('pasados los días de gracia pierde el acceso', () => {
    expect(feeStatus('2026-11-05', today)).toBe('OVERDUE'); // 5 días: todavía en gracia
    expect(feeStatus('2026-11-04', today)).toBe('LAPSED'); // 6 días
    expect(feeStatus('2026-11-04', today, 10)).toBe('OVERDUE');
  });

  it('ordena primero lo que hay que cobrar ya', () => {
    expect(feeRank('LAPSED')).toBeLessThan(feeRank('OVERDUE'));
    expect(feeRank('OVERDUE')).toBeLessThan(feeRank('DUE_TODAY'));
    expect(feeRank('DUE_TODAY')).toBeLessThan(feeRank('SOON'));
    expect(feeRank('SOON')).toBeLessThan(feeRank('OK'));
  });
});

describe('lista pegada de clientes', () => {
  it('lee nombre, mail, teléfono, cuota y vencimiento', () => {
    const r = parseClientLines('Ana Pérez, ana@x.com, 11 5555-1234, 25000, 2026-11-20');
    expect(r.invalid).toEqual([]);
    expect(r.valid[0]).toEqual({ name: 'Ana Pérez', email: 'ana@x.com', phone: '11 5555-1234', fee: 25000, paidUntil: '2026-11-20' });
  });

  it('solo el nombre es obligatorio y el resto puede faltar', () => {
    const r = parseClientLines('Luis\nMarta, marta@x.com');
    expect(r.valid.map((v) => v.name)).toEqual(['Luis', 'Marta']);
    expect(r.valid[1]!.email).toBe('marta@x.com');
    expect(r.valid[0]!.fee).toBeNull();
  });

  it('acepta fechas como 20/11/2026 y montos como 25.000', () => {
    const r = parseClientLines('Sol, 25.000, 20/11/2026');
    expect(r.valid[0]!.fee).toBe(25000);
    expect(r.valid[0]!.paidUntil).toBe('2026-11-20');
  });

  it('un teléfono largo sin símbolos no se confunde con un monto', () => {
    const r = parseClientLines('Pedro, 1155551234, 18000');
    expect(r.valid[0]!.phone).toBe('1155551234');
    expect(r.valid[0]!.fee).toBe(18000);
  });

  it('separa lo que no se entiende', () => {
    const r = parseClientLines('Ana, ana@x.com\nx\nJuan, mailroto@\nLuis, algo raro');
    expect(r.valid.map((v) => v.name)).toEqual(['Ana']);
    expect(r.invalid).toHaveLength(3);
  });
});
