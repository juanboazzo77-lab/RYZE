import { describe, expect, it } from 'vitest';
import { pickHeroDay } from './today-pick';

const d = (id: string, weekday: number | null) => ({ id, weekday });

describe('pickHeroDay', () => {
  it('sin días no hay nada que destacar', () => {
    expect(pickHeroDay([], 3)).toBeNull();
  });
  it('si hoy tiene rutina, esa', () => {
    expect(pickHeroDay([d('a', 1), d('b', 3), d('c', 5)], 3)).toEqual({ day: d('b', 3), isToday: true });
  });
  it('si hoy no entrena, el próximo día con rutina', () => {
    expect(pickHeroDay([d('a', 1), d('b', 3), d('c', 5)], 4)).toEqual({ day: d('c', 5), isToday: false });
  });
  it('da la vuelta a la semana: el sábado mira el lunes', () => {
    expect(pickHeroDay([d('a', 1), d('b', 3)], 6)).toEqual({ day: d('a', 1), isToday: false });
  });
  it('sin días asignados, el primero', () => {
    expect(pickHeroDay([d('a', null), d('b', null)], 2)).toEqual({ day: d('a', null), isToday: false });
  });
});
