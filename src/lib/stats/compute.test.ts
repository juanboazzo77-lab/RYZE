import { describe, expect, it } from 'vitest';
import { consistencyView } from '@/features/consistency/view';
import { readAppData, reducers } from '@/lib/sync/data';
import { hasStats } from '@/lib/sync/progress';
import { finishDraft, newDraft, patchSet, WORKOUT_OP } from '@/lib/sync/workout';
import { computeStats } from './compute';

const ZONE = 'America/Argentina/Buenos_Aires';
const NOW = new Date('2026-11-26T15:00:00Z'); // jueves

describe('estadísticas', () => {
  const base = { foodByDay: [], target: null, timezone: ZONE, weekStart: 1, now: NOW };

  it('arma 8 semanas, con la actual al final, y suma el volumen', () => {
    const s = computeStats({
      ...base,
      workouts: [
        { finishedAt: '2026-11-24T22:00:00Z', volume: 1000.4 },
        { finishedAt: '2026-11-25T22:00:00Z', volume: 500.4 },
        { finishedAt: '2026-11-17T22:00:00Z', volume: 200 },
        { finishedAt: '2026-08-01T22:00:00Z', volume: 999 },
      ],
    });
    expect(s.weeks).toHaveLength(8);
    expect(s.weeks.at(-1)).toMatchObject({ weekStartISO: '2026-11-23', workouts: 2, volume: 1501 });
    expect(s.weeks.at(-2)).toMatchObject({ workouts: 1, volume: 200 });
    expect(s.weeks.reduce((n, w) => n + w.workouts, 0)).toBe(3);
  });

  it('la semana sale del día local: el domingo a la noche es de esa semana, no de la siguiente', () => {
    // Domingo 22/11 a las 22:30 en Argentina: en hora universal ya es lunes 23.
    const s = computeStats({ ...base, workouts: [{ finishedAt: '2026-11-23T01:30:00Z', volume: 1 }] });
    expect(s.weeks.at(-1)!.workouts).toBe(0);
    expect(s.weeks.at(-2)!.workouts).toBe(1);
  });

  it('promedios y cumplimiento de la comida', () => {
    const s = computeStats({ ...base, workouts: [], foodByDay: [{ kcal: 2000, proteinG: 150 }, { kcal: 3000, proteinG: 100 }], target: { kcal: 2000, proteinG: 150 } });
    expect(s).toMatchObject({ avgKcal: 2500, avgProtein: 125, adherencePct: 50, loggedDays: 2 });
    expect(computeStats({ ...base, workouts: [] })).toMatchObject({ avgKcal: null, adherencePct: null, loggedDays: 0 });
  });
});

describe('qué incluye el plan', () => {
  it('sin acceso no se ve, y la prueba gratis se termina a su hora aunque no haya señal', () => {
    expect(hasStats(undefined, NOW)).toBe(false);
    expect(hasStats({ advancedStats: false, until: null }, NOW)).toBe(false);
    expect(hasStats({ advancedStats: true, until: null }, NOW)).toBe(true);
    expect(hasStats({ advancedStats: true, until: '2026-11-27T00:00:00Z' }, NOW)).toBe(true);
    expect(hasStats({ advancedStats: true, until: '2026-11-26T14:59:00Z' }, NOW)).toBe(false);
  });
});

describe('un entrenamiento terminado sin señal', () => {
  it('cuenta enseguida en las estadísticas y en la constancia, una sola vez', () => {
    let n = 0;
    const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
    const exercise = { id: id(), exerciseId: id(), name: 'Press', type: 'STRENGTH' as const, primaryMuscle: 'CHEST', targetSets: 1, targetRepsMin: 8, targetRepsMax: 10, targetRir: 2, restSeconds: 90, targetDurationSec: null, targetDistanceMeters: null, notes: null };
    let draft = newDraft({ id: id(), name: 'Día', exercises: [exercise] }, id, new Date('2026-11-26T01:00:00Z'));
    const e = draft.exercises[0]!;
    draft = patchSet(draft, e.id, e.sets[0]!.id, { weightKg: 50, reps: 10, isCompleted: true });
    const workout = finishDraft(draft, 7, new Date('2026-11-26T02:00:00Z'));
    const data = {
      profile: { name: null, email: 'a@example.com', timezone: ZONE, unitSystem: 'METRIC', weekStart: 1, locale: 'ES' },
      weights: [],
      training: { plan: null, recentWorkouts: [] },
      stats: { workouts: [], records: [] },
      trainedDays: ['2026-11-24'],
    };
    const op = { id: id(), type: WORKOUT_OP, payload: workout, createdAt: workout.finishedAt };
    const once = reducers[WORKOUT_OP]!(data, op);
    const twice = reducers[WORKOUT_OP]!(once, op);
    const out = readAppData(twice)!;
    expect(out.stats!.workouts).toEqual([{ id: workout.workoutId, finishedAt: workout.finishedAt, volume: 500 }]);
    // 23:00 del 25 en Argentina.
    expect(out.trainedDays).toEqual(['2026-11-24', '2026-11-25']);
    expect(consistencyView(new Set(out.trainedDays), '2026-11-26', 1)).toMatchObject({ streak: 2, longest: 2, totalDays: 2 });
  });
});
