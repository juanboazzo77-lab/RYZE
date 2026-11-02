import { describe, expect, it } from 'vitest';
import { activeWeekShift, effectiveWeekday, shiftWeekday } from './weekday';

describe('shiftWeekday', () => {
  it('corre un día hacia adelante', () => {
    expect(shiftWeekday(1, 1)).toBe(2);
    expect(shiftWeekday(3, 1)).toBe(4);
  });
  it('el domingo da la vuelta al lunes', () => {
    expect(shiftWeekday(7, 1)).toBe(1);
  });
  it('corre un día hacia atrás y el lunes pasa al domingo', () => {
    expect(shiftWeekday(4, -1)).toBe(3);
    expect(shiftWeekday(1, -1)).toBe(7);
  });
  it('mover 7 días deja todo igual', () => {
    for (let d = 1; d <= 7; d++) expect(shiftWeekday(d, 7)).toBe(d);
  });
});

describe('activeWeekShift', () => {
  const plan = { weekShift: 1, weekShiftStart: new Date('2026-11-02T00:00:00.000Z') };
  it('rige durante la semana en que se pidió', () => {
    expect(activeWeekShift(plan, '2026-11-02')).toBe(1);
  });
  it('la semana siguiente los días vuelven a los de siempre', () => {
    expect(activeWeekShift(plan, '2026-11-09')).toBe(0);
  });
  it('sin corrimiento pedido no hay nada que aplicar', () => {
    expect(activeWeekShift({ weekShift: 0, weekShiftStart: null }, '2026-11-02')).toBe(0);
  });
});

describe('effectiveWeekday', () => {
  it('aplica el corrimiento y respeta los días sin asignar', () => {
    expect(effectiveWeekday(3, 1)).toBe(4);
    expect(effectiveWeekday(7, 1)).toBe(1);
    expect(effectiveWeekday(null, 1)).toBeNull();
  });
});
