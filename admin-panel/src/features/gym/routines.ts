/**
 * Rutinas oficiales de un gimnasio. Hay una copia de este archivo en admin-panel/src/features/gym/routines.ts
 * (el panel es un sitio aparte): si cambia uno, cambiar el otro.
 */

export interface RoutineExercise {
  name: string;
  /** Series: texto libre ("4"). */
  sets: string;
  /** Repeticiones o tiempo: texto libre ("8-10", "30 s"). */
  reps: string;
  note: string;
}

export interface RoutineDay {
  name: string;
  exercises: RoutineExercise[];
}

export interface RoutineInput {
  title: string;
  description: string;
  level: string | null;
  days: RoutineDay[];
}

export const ROUTINE_LEVELS = [
  { key: 'PRINCIPIANTE', label: 'Principiante' },
  { key: 'INTERMEDIO', label: 'Intermedio' },
  { key: 'AVANZADO', label: 'Avanzado' },
] as const;

export const MAX_ROUTINES_PER_GYM = 30;
export const MAX_DAYS = 7;
export const MAX_EXERCISES_PER_DAY = 20;

export const levelLabel = (key: string | null | undefined): string | null => ROUTINE_LEVELS.find((l) => l.key === key)?.label ?? null;

const clip = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Lee los días guardados (JSON) de forma defensiva: lo que no cierre se descarta. */
export function parseRoutineDays(raw: unknown): RoutineDay[] {
  if (!Array.isArray(raw)) return [];
  const days: RoutineDay[] = [];
  for (const d of raw.slice(0, MAX_DAYS)) {
    if (!d || typeof d !== 'object') continue;
    const o = d as Record<string, unknown>;
    const exercises: RoutineExercise[] = [];
    for (const e of (Array.isArray(o.exercises) ? o.exercises : []).slice(0, MAX_EXERCISES_PER_DAY)) {
      if (!e || typeof e !== 'object') continue;
      const x = e as Record<string, unknown>;
      const name = clip(x.name, 80);
      if (name) exercises.push({ name, sets: clip(x.sets, 12), reps: clip(x.reps, 24), note: clip(x.note, 160) });
    }
    if (exercises.length > 0) days.push({ name: clip(o.name, 60), exercises });
  }
  return days;
}

/** Limpia lo que escribe el profe: recorta, saca lo vacío y exige un título y al menos un ejercicio. */
export function cleanRoutine(input: { title?: unknown; description?: unknown; level?: unknown; days?: unknown }): RoutineInput | null {
  const title = clip(input.title, 80);
  if (title.length < 2) return null;
  const days = parseRoutineDays(input.days).map((d, i) => ({ ...d, name: d.name || `Día ${i + 1}` }));
  if (days.length === 0) return null;
  const level = typeof input.level === 'string' && ROUTINE_LEVELS.some((l) => l.key === input.level) ? input.level : null;
  return { title, description: clip(input.description, 400), level, days };
}

export const countExercises = (days: RoutineDay[]): number => days.reduce((n, d) => n + d.exercises.length, 0);
