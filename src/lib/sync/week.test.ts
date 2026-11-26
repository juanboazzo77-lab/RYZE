import { describe, expect, it } from 'vitest';
import { appDataSchema, type TrainingPlan } from './data';
import { weekFromTraining } from './week';

const exercise = (id: string) => ({
  id, exerciseId: `ex-${id}`, name: 'Press banca', type: 'STRENGTH' as const, primaryMuscle: 'CHEST', targetSets: 4,
  targetRepsMin: 8, targetRepsMax: 10, targetRir: 2, restSeconds: 120, targetDurationSec: null, targetDistanceMeters: null, notes: null,
});
const plan: TrainingPlan = {
  id: 'p', name: 'Rutina', weekShift: 0, weekShiftStart: null,
  days: [
    { id: 'lun', name: 'Empuje', weekday: 1, exercises: [exercise('1'), exercise('2')] },
    { id: 'mie', name: 'Tirón', weekday: 3, exercises: [exercise('3')] },
  ],
};
const profile = { timezone: 'America/Argentina/Buenos_Aires', weekStart: 1 };
// Semana del lunes 23 al domingo 29 de noviembre de 2026.
const done = [{ planDayId: 'lun', finishedAt: '2026-11-23T22:00:00.000Z' }];

describe('la semana calculada en el teléfono', () => {
  it('marca lo hecho esta semana y cuenta los ejercicios', () => {
    const w = weekFromTraining(plan, done, profile, new Date('2026-11-25T15:00:00Z'));
    expect(w.todayWeekday).toBe(3);
    expect(w.days.map((d) => [d.id, d.done, d.exerciseCount])).toEqual([['lun', true, 2], ['mie', false, 1]]);
  });

  it('sin volver a conectarse, la semana siguiente arranca de cero', () => {
    const w = weekFromTraining(plan, done, profile, new Date('2026-11-30T15:00:00Z'));
    expect(w.days.every((d) => !d.done)).toBe(true);
    expect(w.todayWeekday).toBe(1);
  });

  it('usa el día de la persona: el domingo a las 23 en Argentina todavía es la misma semana', () => {
    // 30/11 02:00 UTC = domingo 29/11 23:00 en Argentina
    const w = weekFromTraining(plan, done, profile, new Date('2026-11-30T02:00:00Z'));
    expect(w.todayWeekday).toBe(7);
    expect(w.days.find((d) => d.id === 'lun')!.done).toBe(true);
  });

  it('correr los días vale sólo en la semana en que se pidió', () => {
    const shifted = { ...plan, weekShift: 1, weekShiftStart: '2026-11-23' };
    expect(weekFromTraining(shifted, [], profile, new Date('2026-11-25T15:00:00Z')).days.map((d) => d.weekday)).toEqual([2, 4]);
    expect(weekFromTraining(shifted, [], profile, new Date('2026-12-02T15:00:00Z')).days.map((d) => d.weekday)).toEqual([1, 3]);
  });
});

describe('datos guardados por la versión anterior de la app', () => {
  it('sin la rutina siguen sirviendo', () => {
    const old = {
      profile: { name: null, email: 'a@example.com', timezone: profile.timezone, unitSystem: 'METRIC', weekStart: 1, locale: 'ES' },
      weights: [],
    };
    expect(appDataSchema.safeParse(old).success).toBe(true);
    expect(appDataSchema.safeParse({ ...old, training: { plan: null, recentWorkouts: [] } }).success).toBe(true);
    expect(appDataSchema.safeParse({ ...old, training: { plan } }).success).toBe(false);
  });
});
