import { describe, expect, it } from 'vitest';
import { bookingState, canCancel, cleanClass, startInstant, timeRange, todayAR, upcomingOccurrences, weekdayOf, withinBookingWindow, type ClassSlot } from './classes';

// Viernes 6 de noviembre de 2026, 15:00 en Argentina (= 18:00 UTC)
const NOW = new Date('2026-11-06T18:00:00Z');

describe('fechas y horas de Argentina', () => {
  it('día de la semana ISO', () => {
    expect(weekdayOf('2026-11-06')).toBe(5); // viernes
    expect(weekdayOf('2026-11-08')).toBe(7); // domingo
    expect(weekdayOf('2026-11-09')).toBe(1); // lunes
  });
  it('la fecha de hoy es la de Argentina, no la de UTC', () => {
    expect(todayAR(new Date('2026-11-07T02:00:00Z'))).toBe('2026-11-06'); // 23:00 del 6 en Argentina
    expect(todayAR(new Date('2026-11-07T03:00:00Z'))).toBe('2026-11-07');
  });
  it('19:00 de Argentina son las 22:00 UTC', () => {
    expect(startInstant('2026-11-06', '19:00').toISOString()).toBe('2026-11-06T22:00:00.000Z');
    expect(startInstant('2026-11-06', '23:30').toISOString()).toBe('2026-11-07T02:30:00.000Z');
  });
  it('rango horario', () => {
    expect(timeRange('19:00', 60)).toBe('19:00 a 20:00');
    expect(timeRange('23:30', 60)).toBe('23:30 a 00:30');
  });
});

describe('próximas clases', () => {
  const slots: ClassSlot[] = [
    { id: 'a', weekday: 5, startTime: '10:00', durationMin: 60, capacity: 10 }, // viernes 10:00: ya pasó hoy
    { id: 'b', weekday: 5, startTime: '19:00', durationMin: 60, capacity: 10 }, // viernes 19:00: hoy
    { id: 'c', weekday: 1, startTime: '08:00', durationMin: 60, capacity: 10 }, // lunes
    { id: 'd', weekday: 5, startTime: '19:00', durationMin: 60, capacity: 10 }, // próximo viernes: fuera de los 7 días
  ];
  it('trae las de los próximos 7 días, sin las que ya empezaron, en orden', () => {
    const occ = upcomingOccurrences(slots, NOW);
    expect(occ.map((o) => [o.slot.id, o.date])).toEqual([
      ['b', '2026-11-06'],
      ['d', '2026-11-06'],
      ['c', '2026-11-09'],
    ]);
  });
  it('el mismo día de la semana a 7 días ya no entra (hoy es el día 1 de los 7)', () => {
    expect(upcomingOccurrences([slots[1]!], NOW).map((o) => o.date)).toEqual(['2026-11-06']);
  });
});

describe('qué puede hacer el socio', () => {
  const at = (iso: string) => new Date(iso);
  const base = { capacity: 2, booked: 0, mine: false };
  it('reservable, completa o ya empezó', () => {
    expect(bookingState({ ...base, now: NOW, startsAt: at('2026-11-06T22:00:00Z') })).toBe('BOOKABLE');
    expect(bookingState({ ...base, booked: 2, now: NOW, startsAt: at('2026-11-06T22:00:00Z') })).toBe('FULL');
    expect(bookingState({ ...base, now: NOW, startsAt: at('2026-11-06T17:00:00Z') })).toBe('STARTED');
  });
  it('mi reserva se cancela hasta 2 horas antes, no después', () => {
    // la clase es a las 22:00 UTC; son las 18:00 UTC: faltan 4 horas
    expect(bookingState({ ...base, mine: true, now: NOW, startsAt: at('2026-11-06T22:00:00Z') })).toBe('MINE');
    // faltan exactamente 2 horas: todavía se puede
    expect(bookingState({ ...base, mine: true, now: NOW, startsAt: at('2026-11-06T20:00:00Z') })).toBe('MINE');
    // faltan 119 minutos: ya no
    expect(bookingState({ ...base, mine: true, now: NOW, startsAt: at('2026-11-06T19:59:00Z') })).toBe('MINE_LOCKED');
    expect(canCancel(NOW, at('2026-11-06T20:00:00Z'))).toBe(true);
    expect(canCancel(NOW, at('2026-11-06T19:59:00Z'))).toBe(false);
  });
  it('ventana de reserva: hoy y los 6 días siguientes', () => {
    expect(withinBookingWindow('2026-11-06', NOW)).toBe(true);
    expect(withinBookingWindow('2026-11-12', NOW)).toBe(true);
    expect(withinBookingWindow('2026-11-13', NOW)).toBe(false);
    expect(withinBookingWindow('2026-11-05', NOW)).toBe(false);
    expect(withinBookingWindow('mañana', NOW)).toBe(false);
  });
});

describe('cleanClass', () => {
  const ok = { name: ' Funcional ', description: 'x', instructor: ' Juan ', weekdays: [3, 1, 1], startTime: '19:00', durationMin: 60, capacity: 12 };
  it('limpia, ordena y saca repetidos', () => {
    expect(cleanClass(ok)).toEqual({ name: 'Funcional', description: 'x', instructor: 'Juan', weekdays: [1, 3], startTime: '19:00', durationMin: 60, capacity: 12 });
  });
  it('rechaza lo que no sirve', () => {
    expect(cleanClass({ ...ok, name: 'a' })).toEqual({ error: 'NAME' });
    expect(cleanClass({ ...ok, weekdays: [] })).toEqual({ error: 'WEEKDAYS' });
    expect(cleanClass({ ...ok, weekdays: [0, 8] })).toEqual({ error: 'WEEKDAYS' });
    expect(cleanClass({ ...ok, startTime: '25:00' })).toEqual({ error: 'TIME' });
    expect(cleanClass({ ...ok, durationMin: 5 })).toEqual({ error: 'DURATION' });
    expect(cleanClass({ ...ok, capacity: 0 })).toEqual({ error: 'CAPACITY' });
    expect(cleanClass({ ...ok, capacity: 500 })).toEqual({ error: 'CAPACITY' });
  });
});
