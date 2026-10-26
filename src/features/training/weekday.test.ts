import { describe, expect, it } from 'vitest';
import { shiftWeekday } from './weekday';

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
