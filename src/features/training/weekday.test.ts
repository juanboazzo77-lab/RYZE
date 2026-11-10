import { describe, expect, it } from 'vitest';
import { activeWeekShift, doneWeekdays, effectiveWeekday, shiftWeekday, weekdayThisWeek } from './weekday';

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

describe('doneWeekdays', () => {
  const tz = 'America/Argentina/Buenos_Aires';
  // Lunes 2 de noviembre de 2026, 19:00 en Argentina (= 22:00 UTC)
  const monday = new Date('2026-11-02T22:00:00Z');
  it('un día hecho queda en el día en que se hizo', () => {
    expect([...doneWeekdays([{ planDayId: 'a', finishedAt: monday }], tz, '2026-11-02')]).toEqual([['a', 1]]);
  });
  it('usa el día de la persona, no el de UTC (23:00 del lunes en Argentina ya es martes en UTC)', () => {
    const lateMonday = new Date('2026-11-03T02:00:00Z');
    expect(doneWeekdays([{ planDayId: 'a', finishedAt: lateMonday }], tz, '2026-11-02').get('a')).toBe(1);
  });
  it('lo de semanas anteriores no cuenta', () => {
    expect(doneWeekdays([{ planDayId: 'a', finishedAt: new Date('2026-10-30T15:00:00Z') }], tz, '2026-11-02').size).toBe(0);
  });
  it('sin día de la rutina o sin fecha de fin no cuenta', () => {
    expect(doneWeekdays([{ planDayId: null, finishedAt: monday }, { planDayId: 'a', finishedAt: null }], tz, '2026-11-02').size).toBe(0);
  });
  it('si se hizo dos veces, vale la última', () => {
    const wed = new Date('2026-11-04T15:00:00Z');
    expect(doneWeekdays([{ planDayId: 'a', finishedAt: monday }, { planDayId: 'a', finishedAt: wed }], tz, '2026-11-02').get('a')).toBe(3);
  });
});

describe('weekdayThisWeek', () => {
  const done = new Map([['lunes', 1]]);
  it('lo que ya hiciste no se mueve al pasar un día', () => {
    expect(weekdayThisWeek({ id: 'lunes', weekday: 1 }, 1, done)).toBe(1);
  });
  it('lo que falta hacer sí se corre', () => {
    expect(weekdayThisWeek({ id: 'martes', weekday: 2 }, 1, done)).toBe(3);
    expect(weekdayThisWeek({ id: 'miercoles', weekday: 3 }, 1, done)).toBe(4);
  });
  it('un día hecho después de correr la semana queda donde se hizo', () => {
    // El martes se corrió todo un día: el "Martes" pasó al miércoles y se hizo el miércoles.
    expect(weekdayThisWeek({ id: 'martes', weekday: 2 }, 1, new Map([['martes', 3]]))).toBe(3);
  });
  it('sin día asignado sigue sin día', () => {
    expect(weekdayThisWeek({ id: 'x', weekday: null }, 1, new Map([['x', 4]]))).toBeNull();
  });
  it('sin nada hecho es el corrimiento de siempre', () => {
    expect(weekdayThisWeek({ id: 'a', weekday: 7 }, 1)).toBe(1);
  });
});
