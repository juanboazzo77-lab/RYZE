'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkoutSession } from './queries';
import type { SaveWorkoutInput } from './schema';

export interface StoreSet {
  id: string; // uuid (del server o generado en el cliente)
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  rir: number | null;
  isWarmup: boolean;
  isCompleted: boolean;
}
export interface StoreExercise {
  id: string; // workoutExerciseId
  exerciseId: string;
  name: string;
  type: 'STRENGTH' | 'CARDIO';
  primaryMuscle: string;
  restSeconds: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetDurationSec: number | null;
  targetDistanceMeters: number | null;
  lastTime: Array<{ weightKg: number | null; reps: number | null }> | null;
  sets: StoreSet[];
}

interface SessionState {
  workoutId: string | null;
  exercises: StoreExercise[];
  deletedSetIds: string[];
  dirty: boolean;
  lastSavedAt: number | null;

  hydrate: (s: WorkoutSession) => void;
  patchSet: (exId: string, setId: string, patch: Partial<StoreSet>) => void;
  toggleComplete: (exId: string, setId: string) => boolean; // devuelve el nuevo estado
  addSet: (exId: string) => void;
  removeSet: (exId: string, setId: string) => void;
  appendExercise: (ex: StoreExercise) => void;
  dropExercise: (exId: string) => void;
  markClean: () => void;
  payload: () => SaveWorkoutInput;
}

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

const fromServer = (s: WorkoutSession): StoreExercise[] =>
  s.exercises.map((e) => ({
    id: e.id,
    exerciseId: e.exerciseId,
    name: e.name,
    type: e.type,
    primaryMuscle: e.primaryMuscle,
    restSeconds: e.restSeconds,
    targetRepsMin: e.targetRepsMin,
    targetRepsMax: e.targetRepsMax,
    targetDurationSec: e.targetDurationSec,
    targetDistanceMeters: e.targetDistanceMeters,
    lastTime: e.lastTime,
    sets: e.sets.map((st) => ({
      id: st.id,
      setNumber: st.setNumber,
      weightKg: st.weightKg,
      reps: st.reps,
      durationSeconds: st.durationSeconds,
      distanceMeters: st.distanceMeters,
      rir: st.rir,
      isWarmup: st.isWarmup,
      isCompleted: st.isCompleted,
    })),
  }));

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      workoutId: null,
      exercises: [],
      deletedSetIds: [],
      dirty: false,
      lastSavedAt: null,

      hydrate: (s) => {
        const st = get();
        const server = fromServer(s);
        if (st.workoutId !== s.id || !st.dirty) {
          set({ workoutId: s.id, exercises: server, deletedSetIds: [], dirty: false });
          return;
        }
        // Mismo workout con ediciones locales sin guardar: conservar lo local,
        // sumar ejercicios nuevos del server y descartar los que ya no están.
        const localById = new Map(st.exercises.map((e) => [e.id, e]));
        const merged: StoreExercise[] = [];
        for (const se of server) {
          const local = localById.get(se.id);
          merged.push(local ? { ...se, sets: local.sets } : se);
        }
        set({ workoutId: s.id, exercises: merged });
      },

      patchSet: (exId, setId, patch) =>
        set((s) => ({
          dirty: true,
          exercises: s.exercises.map((e) =>
            e.id !== exId
              ? e
              : { ...e, sets: e.sets.map((x) => (x.id === setId ? { ...x, ...patch } : x)) },
          ),
        })),

      toggleComplete: (exId, setId) => {
        let next = false;
        set((s) => ({
          dirty: true,
          exercises: s.exercises.map((e) =>
            e.id !== exId
              ? e
              : {
                  ...e,
                  sets: e.sets.map((x) => {
                    if (x.id !== setId) return x;
                    next = !x.isCompleted;
                    return { ...x, isCompleted: next };
                  }),
                },
          ),
        }));
        return next;
      },

      addSet: (exId) =>
        set((s) => ({
          dirty: true,
          exercises: s.exercises.map((e) => {
            if (e.id !== exId) return e;
            const prev = e.sets[e.sets.length - 1];
            return {
              ...e,
              sets: [
                ...e.sets,
                {
                  id: uid(),
                  setNumber: e.sets.length + 1,
                  weightKg: prev?.weightKg ?? null,
                  reps: prev?.reps ?? null,
                  durationSeconds: prev?.durationSeconds ?? null,
                  distanceMeters: prev?.distanceMeters ?? null,
                  rir: prev?.rir ?? null,
                  isWarmup: false,
                  isCompleted: false,
                },
              ],
            };
          }),
        })),

      removeSet: (exId, setId) =>
        set((s) => ({
          dirty: true,
          deletedSetIds: [...s.deletedSetIds, setId],
          exercises: s.exercises.map((e) =>
            e.id !== exId
              ? e
              : {
                  ...e,
                  sets: e.sets
                    .filter((x) => x.id !== setId)
                    .map((x, i) => ({ ...x, setNumber: i + 1 })),
                },
          ),
        })),

      appendExercise: (ex) =>
        set((s) => ({ exercises: [...s.exercises.filter((e) => e.id !== ex.id), ex] })),

      dropExercise: (exId) =>
        set((s) => ({ exercises: s.exercises.filter((e) => e.id !== exId) })),

      markClean: () => set({ dirty: false, deletedSetIds: [], lastSavedAt: Date.now() }),

      payload: () => {
        const s = get();
        return {
          workoutId: s.workoutId!,
          deletedSetIds: s.deletedSetIds,
          sets: s.exercises.flatMap((e) =>
            e.sets.map((x) => ({
              id: x.id,
              workoutExerciseId: e.id,
              setNumber: x.setNumber,
              weightKg: x.weightKg,
              reps: x.reps,
              durationSeconds: x.durationSeconds,
              distanceMeters: x.distanceMeters,
              rir: x.rir,
              isWarmup: x.isWarmup,
              isCompleted: x.isCompleted,
            })),
          ),
        };
      },
    }),
    {
      name: 'fitai-active-session',
      partialize: (s) => ({
        workoutId: s.workoutId,
        exercises: s.exercises,
        deletedSetIds: s.deletedSetIds,
        dirty: s.dirty,
      }),
    },
  ),
);
