import { describe, expect, it } from 'vitest';
import { reducers, readAppData, type PlanExerciseRow } from './data';
import { DraftStore } from './draft-store';
import { memoryStore, type KeyValueStore } from './store';
import {
  addSet, applyCompleted, completedWorkoutSchema, finishDraft, newDraft, patchSet, progress, removeExercise, removeSet,
  volumeKg, MAX_PAST, WORKOUT_OP,
} from './workout';

let n = 0;
const newId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const planExercise = (exerciseId: string, sets: number, type: 'STRENGTH' | 'CARDIO' = 'STRENGTH'): PlanExerciseRow => ({
  id: newId(), exerciseId, name: 'Press banca', type, primaryMuscle: 'CHEST', targetSets: sets, targetRepsMin: 8,
  targetRepsMax: 10, targetRir: 2, restSeconds: 120, targetDurationSec: null, targetDistanceMeters: null, notes: null,
});
const PRESS = '11111111-1111-4111-8111-111111111111';
const FONDOS = '22222222-2222-4222-8222-222222222222';
const day = { id: '33333333-3333-4333-8333-333333333333', name: 'Empuje', exercises: [planExercise(PRESS, 3), planExercise(FONDOS, 2)] };
const START = new Date('2026-11-25T18:00:00.000Z');
const END = new Date('2026-11-25T19:05:00.000Z');

function sample() {
  let d = newDraft(day, newId, START);
  const [press] = d.exercises;
  d = patchSet(d, press!.id, press!.sets[0]!.id, { weightKg: 40, reps: 12, isWarmup: true, isCompleted: true });
  d = patchSet(d, press!.id, press!.sets[1]!.id, { weightKg: 60, reps: 10, isCompleted: true });
  d = patchSet(d, press!.id, press!.sets[2]!.id, { weightKg: 62.5, reps: 8, isCompleted: true });
  return d;
}

describe('borrador del entrenamiento', () => {
  it('arranca con las series del plan, vacías', () => {
    const d = newDraft(day, newId, START);
    expect(d.exercises.map((e) => e.sets.length)).toEqual([3, 2]);
    expect(d.exercises[0]!.sets.every((s) => s.weightKg === null && !s.isCompleted)).toBe(true);
    expect(new Set([d.workoutId, ...d.exercises.flatMap((e) => [e.id, ...e.sets.map((s) => s.id)])]).size).toBe(8);
  });

  it('cuenta avance y kilos sin el calentamiento', () => {
    expect(progress(sample())).toEqual({ done: 2, total: 4 });
    expect(volumeKg(sample())).toBe(60 * 10 + 62.5 * 8);
  });

  it('agrega una serie copiando la anterior y al borrar renumera', () => {
    let d = sample();
    const press = d.exercises[0]!;
    d = addSet(d, press.id, newId);
    expect(d.exercises[0]!.sets.at(-1)).toMatchObject({ setNumber: 4, weightKg: 62.5, reps: 8, isCompleted: false });
    d = removeSet(d, press.id, press.sets[0]!.id);
    expect(d.exercises[0]!.sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
    expect(removeExercise(d, press.id).exercises).toHaveLength(1);
  });

  it('un número disparatado no deja el entrenamiento sin poder subirse', () => {
    let d = newDraft(day, newId, START);
    const e = d.exercises[0]!;
    d = patchSet(d, e.id, e.sets[0]!.id, { weightKg: 999999, reps: 10.7, rir: -3 });
    d = patchSet(d, e.id, e.sets[1]!.id, { weightKg: Number.NaN });
    expect(d.exercises[0]!.sets[0]).toMatchObject({ weightKg: 2000, reps: 11, rir: 0 });
    expect(d.exercises[0]!.sets[1]!.weightKg).toBeNull();
    expect(completedWorkoutSchema.safeParse(finishDraft(d, 7, END)).success).toBe(true);
  });

  it('el final nunca queda antes del comienzo', () => {
    expect(finishDraft(sample(), null, new Date('2026-11-25T17:00:00Z')).finishedAt).toBe(START.toISOString());
  });
});

describe('al terminar sin señal', () => {
  const training = {
    plan: null,
    recentWorkouts: [],
    history: { [PRESS]: { lastTime: [{ weightKg: 55, reps: 10 }], bestWeightKg: 65 }, [FONDOS]: { lastTime: [{ weightKg: null, reps: 12 }], bestWeightKg: null } },
  };

  it('el día queda hecho y lo cargado pasa a ser la última vez, sin bajar el récord', () => {
    const out = applyCompleted(training, finishDraft(sample(), 8, END));
    expect(out.recentWorkouts).toEqual([{ planDayId: day.id, finishedAt: END.toISOString() }]);
    expect(out.history![PRESS]).toEqual({ lastTime: [{ weightKg: 40, reps: 12 }, { weightKg: 60, reps: 10 }, { weightKg: 62.5, reps: 8 }], bestWeightKg: 65 });
    // Un ejercicio sin series hechas conserva su historial.
    expect(out.history![FONDOS]).toEqual(training.history[FONDOS]);
  });

  it('aplicado dos veces no duplica (el envío puede repetirse)', () => {
    const w = finishDraft(sample(), 8, END);
    expect(applyCompleted(applyCompleted(training, w), w)).toEqual(applyCompleted(training, w));
  });

  it('la pantalla lo muestra aunque siga sin subir', () => {
    const base = {
      profile: { name: null, email: 'a@example.com', timezone: 'America/Argentina/Buenos_Aires', unitSystem: 'METRIC', weekStart: 1, locale: 'ES' },
      weights: [],
      training,
    };
    const view = reducers[WORKOUT_OP]!(base, { id: newId(), type: WORKOUT_OP, payload: finishDraft(sample(), 8, END), createdAt: END.toISOString() });
    expect(readAppData(view)!.training!.recentWorkouts).toHaveLength(1);
    expect(reducers[WORKOUT_OP]!(base, { id: newId(), type: WORKOUT_OP, payload: { roto: true }, createdAt: END.toISOString() })).toBe(base);
  });
});

describe('DraftStore', () => {
  it('el entrenamiento sigue ahí después de cerrar y abrir la app', async () => {
    const files = memoryStore();
    const first = new DraftStore('ana', files);
    await first.load();
    await first.update(() => sample());
    const reopened = new DraftStore('ana', files);
    await reopened.load();
    expect(reopened.get()).toEqual(first.get());
    const other = new DraftStore('bruno', files);
    await other.load();
    expect(other.get()).toBeNull();
  });

  it('muchos cambios seguidos: queda el último', async () => {
    const files = memoryStore();
    const store = new DraftStore('ana', files);
    await store.load();
    await store.update(() => newDraft(day, newId, START));
    const e = store.get()!.exercises[0]!;
    await Promise.all(Array.from({ length: 40 }, (_, i) => store.update((d) => patchSet(d!, e.id, e.sets[0]!.id, { reps: i + 1 }))));
    const reopened = new DraftStore('ana', files);
    await reopened.load();
    expect(reopened.get()!.exercises[0]!.sets[0]!.reps).toBe(40);
  });

  it('si no se puede guardar, avisa; y un borrador dañado se aparta sin pisarlo', async () => {
    const broken: KeyValueStore = { ...memoryStore(), set: async () => Promise.reject(new Error('disco lleno')) };
    const store = new DraftStore('ana', broken);
    await store.load();
    await expect(store.update(() => sample())).rejects.toThrow('disco lleno');

    const files = memoryStore({ 'forza.draft.v1.ana': '{roto' });
    const damaged = new DraftStore('ana', files);
    await damaged.load();
    expect(damaged.get()).toBeNull();
    expect(Object.keys(files.dump()).some((k) => k.includes('.damaged.'))).toBe(true);
  });

  it('al borrar no queda nada', async () => {
    const files = memoryStore();
    const store = new DraftStore('ana', files);
    await store.load();
    await store.update(() => sample());
    await store.clear();
    expect(files.dump()).toEqual({});
  });
});

describe('historial sin conexión', () => {
  const base = { plan: null, recentWorkouts: [], history: {} };

  it('lo recién terminado aparece primero, sin duplicarse, y con los récords que ya tenga', () => {
    const w = finishDraft(sample(), 8, END);
    const out = applyCompleted(base, w);
    expect(out.past![0]).toMatchObject({ id: w.workoutId, name: 'Empuje', durationSeconds: 3900, records: [] });
    expect(out.past![0]!.exercises[0]!.sets).toHaveLength(3);
    const fromServer = { ...out, past: [{ ...out.past![0]!, records: [{ exerciseId: PRESS, type: 'MAX_WEIGHT' as const }] }] };
    expect(applyCompleted(fromServer, w).past).toEqual(fromServer.past);
  });

  it('guarda sólo los últimos, del más nuevo al más viejo', () => {
    let training = applyCompleted(base, finishDraft(sample(), null, END));
    for (let i = 1; i <= MAX_PAST + 5; i++) {
      const d = { ...sample(), workoutId: newId() };
      training = applyCompleted(training, finishDraft(d, null, new Date(END.getTime() + i * 86400000)));
    }
    expect(training.past).toHaveLength(MAX_PAST);
    const dates = training.past!.map((p) => p.finishedAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});
