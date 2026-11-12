import { describe, expect, it } from 'vitest';
import { countByMonth, fillPercent, lastMonths, monthLabel, occurrencesBetween, sumByMonth } from './reports';

describe('reportes del gimnasio', () => {
  it('arma los últimos meses, incluso cruzando de año', () => {
    expect(lastMonths(3, new Date('2026-01-15T00:00:00Z'))).toEqual(['2025-11', '2025-12', '2026-01']);
    expect(lastMonths(1, new Date('2026-11-12T00:00:00Z'))).toEqual(['2026-11']);
    expect(monthLabel('2026-11')).toBe('nov 26');
  });

  it('cuenta por mes e ignora lo que queda afuera', () => {
    const months = ['2026-09', '2026-10', '2026-11'];
    const dates = [new Date('2026-10-02T00:00:00Z'), new Date('2026-10-30T00:00:00Z'), new Date('2026-11-01T00:00:00Z'), new Date('2025-01-01T00:00:00Z'), null];
    expect(countByMonth(dates, months)).toEqual([0, 2, 1]);
  });

  it('suma montos por mes', () => {
    const months = ['2026-10', '2026-11'];
    expect(sumByMonth([{ date: new Date('2026-10-05T00:00:00Z'), amount: 25000 }, { date: new Date('2026-10-20T00:00:00Z'), amount: 5000 }, { date: new Date('2026-11-02T00:00:00Z'), amount: 18000 }], months)).toEqual([30000, 18000]);
  });

  it('calcula la ocupación de una clase', () => {
    expect(fillPercent(24, 12, 4)).toBe(50);
    expect(fillPercent(60, 12, 4)).toBe(100);
    expect(fillPercent(5, 12, 0)).toBe(0);
  });

  it('cuenta cuántas veces se dio una clase en un período', () => {
    // 2026-11-02 es lunes: del 2 al 29 de noviembre hay 4 lunes y 4 domingos
    expect(occurrencesBetween(1, '2026-11-02', '2026-11-29')).toBe(4);
    expect(occurrencesBetween(7, '2026-11-02', '2026-11-29')).toBe(4);
    expect(occurrencesBetween(3, '2026-11-02', '2026-11-04')).toBe(1);
  });
});
