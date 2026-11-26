import { describe, expect, it } from 'vitest';
import { WORKOUT_OP, type CompletedWorkout } from '@/lib/sync/workout';
import { RejectedOperation } from './apply';
import { buildHandlers, type MobileTx } from './handlers';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const PRESS = id(100);
const AJENO = id(101);
const DAY = id(200);

function fakeDb(options: { exercises?: Array<{ id: string; isCustom: boolean; createdById: string | null }>; planDays?: string[]; planExercises?: string[]; existing?: string[]; createError?: unknown } = {}) {
  const exercises = options.exercises ?? [{ id: PRESS, isCustom: false, createdById: null }];
  const created: Array<Record<string, any>> = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  const tx = {
    workout: {
      async findFirst({ where }: { where: { id: string } }) {
        return options.existing?.includes(where.id) ? { id: where.id } : null;
      },
      async create({ data }: { data: Record<string, unknown> }) {
        if (options.createError) throw options.createError;
        created.push(data);
      },
    },
    exercise: {
      async findMany({ where }: { where: { id: { in: string[] } } }) {
        return exercises.filter((e) => where.id.in.includes(e.id));
      },
    },
    // La base ya viene acotada a la persona: sólo "encuentra" sus rutinas.
    workoutPlan: {
      async findFirst({ where }: { where: any }) { // eslint-disable-line @typescript-eslint/no-explicit-any
        const day = where.days.some.id as string | undefined;
        if (day) return options.planDays?.includes(day) ? { id: id(300) } : null;
        return options.planExercises?.includes(where.days.some.exercises.some.exerciseId) ? { id: id(300) } : null;
      },
    },
  } as unknown as MobileTx;
  return { tx, created };
}

const workout = (patch: Partial<CompletedWorkout> = {}, exerciseId = PRESS): CompletedWorkout => ({
  workoutId: id(1),
  planDayId: DAY,
  name: 'Empuje',
  startedAt: '2026-11-23T21:00:00.000Z',
  finishedAt: '2026-11-23T22:05:00.000Z',
  perceivedEffort: 8,
  exercises: [
    {
      id: id(2), exerciseId, name: 'Press banca', type: 'STRENGTH', primaryMuscle: 'CHEST', targetRepsMin: 8, targetRepsMax: 10,
      targetRir: 2, restSeconds: 120, targetDurationSec: null, targetDistanceMeters: null, notes: null,
      sets: [
        { id: id(3), setNumber: 1, weightKg: 60, reps: 10, durationSeconds: null, distanceMeters: null, rir: null, isWarmup: false, isCompleted: true },
        { id: id(4), setNumber: 2, weightKg: null, reps: null, durationSeconds: null, distanceMeters: null, rir: null, isWarmup: false, isCompleted: false },
      ],
    },
  ],
  ...patch,
});

const handle = buildHandlers({ userId: 'ana', timezone: 'America/Argentina/Buenos_Aires' })[WORKOUT_OP]!;
// Se sube dos días después: el entrenamiento sigue siendo del lunes.
const at = new Date('2026-11-23T22:05:03.000Z');

describe('workout.complete', () => {
  it('guarda el entrenamiento entero, con la hora en que se hizo y de quién es', async () => {
    const f = fakeDb({ planDays: [DAY] });
    await handle(f.tx, { payload: workout(), at });
    const w = f.created[0]!;
    expect(w).toMatchObject({ id: id(1), userId: 'ana', status: 'COMPLETED', planId: id(300), planDayId: DAY, durationSeconds: 3900, perceivedEffort: 8 });
    expect(w.finishedAt.toISOString()).toBe('2026-11-23T22:05:00.000Z');
    const sets = w.exercises.create[0].sets.create;
    expect(sets).toHaveLength(2);
    expect(sets[0]).toMatchObject({ id: id(3), weightKg: 60, reps: 10, isCompleted: true });
    expect(sets[0].completedAt).toEqual(w.finishedAt);
    expect(sets[1].completedAt).toBeNull();
    // El nombre y el músculo del ejercicio no se escriben: salen de la base.
    expect(w.exercises.create[0]).not.toHaveProperty('name');
  });

  it('si ya estaba guardado no lo duplica', async () => {
    const f = fakeDb({ existing: [id(1)] });
    await handle(f.tx, { payload: workout(), at });
    expect(f.created).toHaveLength(0);
  });

  it('si la rutina se borró mientras no había señal, se guarda igual sin vincularlo', async () => {
    const f = fakeDb({ planDays: [] });
    await handle(f.tx, { payload: workout(), at });
    expect(f.created[0]).toMatchObject({ planId: null, planDayId: null });
  });

  it('no acepta horas posteriores a cuando se anotó, ni duraciones imposibles', async () => {
    const f = fakeDb();
    await handle(f.tx, { payload: workout({ finishedAt: '2026-12-30T00:00:00.000Z', startedAt: '2026-01-01T00:00:00.000Z' }), at });
    expect(f.created[0]!.finishedAt).toEqual(at);
    expect(f.created[0]!.durationSeconds).toBe(86400);
  });

  it('rechaza datos fuera de los topes y ejercicios que no existen', async () => {
    const bad = workout();
    bad.exercises[0]!.sets[0]!.weightKg = 99999;
    for (const payload of [bad, { ...workout(), exercises: 'x' }, workout({ perceivedEffort: 11 })]) {
      await expect(handle(fakeDb().tx, { payload, at })).rejects.toThrow('INVALID');
    }
    await expect(handle(fakeDb({ exercises: [] }).tx, { payload: workout(), at })).rejects.toThrow('UNKNOWN_EXERCISE');
  });

  it('un ejercicio propio de otra persona sólo vale si está en una rutina mía (por ejemplo, la de mi gimnasio)', async () => {
    const exercises = [{ id: AJENO, isCustom: true, createdById: 'otra-persona' }];
    const stranger = fakeDb({ exercises });
    await expect(handle(stranger.tx, { payload: workout({}, AJENO), at })).rejects.toThrow('UNKNOWN_EXERCISE');
    const inMyPlan = fakeDb({ exercises, planExercises: [AJENO] });
    await handle(inMyPlan.tx, { payload: workout({}, AJENO), at });
    expect(inMyPlan.created).toHaveLength(1);
  });

  it('un identificador que ya usa otro registro se rechaza en vez de trabar la cola', async () => {
    await expect(handle(fakeDb({ createError: { code: 'P2002' } }).tx, { payload: workout(), at })).rejects.toThrow(RejectedOperation);
    await expect(handle(fakeDb({ createError: new Error('base caída') }).tx, { payload: workout(), at })).rejects.toThrow('base caída');
  });
});
