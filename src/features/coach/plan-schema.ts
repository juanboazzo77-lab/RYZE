import { z } from 'zod';

/**
 * Forma del plan de entrenamiento que devuelve la IA. Deliberadamente plano
 * (sin uniones ni refinamientos) para que Gemini lo respete como JSON Schema.
 * El servidor resuelve `name` → ejercicio de la biblioteca al aceptar.
 *
 * El modelo a veces se pasa de un límite (texto largo, 9 ejercicios en un día,
 * un número fuera de rango). Descartar TODO el plan por eso deja al usuario sin
 * rutina, así que los límites se informan al modelo (JSON Schema) pero al
 * validar se recortan/ajustan en vez de rechazar.
 */

/** String con largo máximo: si se pasa, se recorta. */
const str = (max: number) =>
  z
    .string()
    .max(max)
    .catch((ctx) => (typeof ctx.input === 'string' ? ctx.input.slice(0, max) : ''));

/** Entero en rango: si se pasa o no es entero, se redondea y se ajusta al rango. */
const int = (min: number, max: number) =>
  z
    .number()
    .int()
    .min(min)
    .max(max)
    .catch((ctx) => {
      const n = Math.round(Number(ctx.input));
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
    });

export const planDraftExercise = z.object({
  name: str(80),
  type: z.enum(['STRENGTH', 'CARDIO']).optional().catch(undefined),
  sets: int(1, 10),
  repsMin: int(1, 50),
  repsMax: int(1, 50),
  rir: int(0, 5),
  restSeconds: int(15, 600),
  /** Solo para type=CARDIO: duración objetivo del bloque (minutos). */
  durationMinutes: int(1, 180).optional(),
  /** Solo para type=CARDIO: distancia objetivo del bloque (km). */
  distanceKm: z.number().min(0.1).max(100).optional().catch(undefined),
  /** Aclaración corta: cue técnico, o qué significan sets/reps en un drill
   * de cancha (ej. "series = rondas, reps = sprints de 20m"). */
  note: str(140).optional(),
  /** Por qué se eligió este ejercicio para este cliente puntual (breve,
   * concreto, referenciando su objetivo/condición/deporte). */
  rationale: str(160).optional(),
  /** Hasta 3 alternativas equivalentes (mismo grupo muscular) que el usuario
   * puede elegir en lugar de este ejercicio, p. ej. si no tiene la máquina. */
  alternatives: z
    .array(str(80))
    .max(3)
    .optional()
    .catch((ctx) =>
      Array.isArray(ctx.input)
        ? ctx.input.filter((x): x is string => typeof x === 'string').slice(0, 3).map((x) => x.slice(0, 80))
        : undefined,
    ),
});

export const planDraftDay = z.object({
  name: str(40),
  weekday: int(1, 7),
  // Hasta 12: con calentamiento y movilidad un día puede pasar de 8.
  exercises: z.array(planDraftExercise).min(1).max(12),
});

export const planDraftSchema = z.object({
  name: str(60),
  description: str(300),
  weeklyNote: str(300),
  days: z.array(planDraftDay).min(1).max(7),
});

export type PlanDraft = z.infer<typeof planDraftSchema>;
export type PlanDraftDay = z.infer<typeof planDraftDay>;
export type PlanDraftExercise = z.infer<typeof planDraftExercise>;

/** Objetivos nutricionales calculados (deterministas, no IA) para el borrador. */
export interface NutritionDraft {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  adjustmentPct: number;
  /** Por qué estos números para este cliente (objetivo, ritmo, actividad). */
  rationale: string;
}
