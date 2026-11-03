import { z } from 'zod';

/** Alimento que el coach identificó en la pregunta, con valores por 100 g. */
export const coachFoodSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kcalPer100: z.number().min(0).max(1000),
  proteinPer100: z.number().min(0).max(100),
  carbsPer100: z.number().min(0).max(100),
  fatPer100: z.number().min(0).max(100),
  /** Porción típica en gramos para proponerle al usuario. */
  suggestedGrams: z.number().min(1).max(2000),
});
export type CoachFood = z.infer<typeof coachFoodSchema>;

/** Ejercicio que el coach explicó o recomendó, con una prescripción sugerida. */
export const coachExerciseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(['STRENGTH', 'CARDIO']).catch('STRENGTH'),
  sets: z.number().int().min(1).max(10),
  repsMin: z.number().int().min(1).max(50),
  repsMax: z.number().int().min(1).max(50),
});
export type CoachExercise = z.infer<typeof coachExerciseSchema>;

const nullableInt = (min: number, max: number) => z.number().int().min(min).max(max).nullable().catch(null);

/**
 * Cambio concreto que el usuario le pidió al coach sobre su rutina activa o sus objetivos de
 * nutrición. La app lo muestra con un botón "Editar" y lo aplica tal cual, sin que la IA toque
 * nada por su cuenta.
 */
export const coachEditSchema = z.object({
  kind: z.enum(['replace_exercise', 'remove_exercise', 'change_exercise', 'nutrition_targets']),
  /** Qué se va a cambiar, en una línea y en el idioma del usuario. */
  summary: z.string().trim().min(1).max(240),
  /** Nombre del ejercicio tal como figura hoy en la rutina. */
  exercise: z.string().trim().min(1).max(80).nullable().catch(null),
  /** Día de la rutina, sólo si el usuario lo aclaró. */
  day: z.string().trim().min(1).max(60).nullable().catch(null),
  /** Ejercicio nuevo (sólo al reemplazar). */
  newExercise: z.string().trim().min(2).max(80).nullable().catch(null),
  type: z.enum(['STRENGTH', 'CARDIO']).catch('STRENGTH'),
  sets: nullableInt(1, 10),
  repsMin: nullableInt(1, 50),
  repsMax: nullableInt(1, 50),
  kcal: nullableInt(1000, 6000),
  proteinG: nullableInt(30, 400),
  carbsG: nullableInt(0, 800),
  fatG: nullableInt(10, 300),
});
export type CoachEdit = z.infer<typeof coachEditSchema>;

const intOrNull = z.number().int().nullable();
const strOrNull = z.string().max(2000).nullable();

/**
 * Cómo volver atrás un cambio que ya se aplicó. Lo arma el servidor al aplicarlo, lo guarda el
 * cliente mientras la pantalla está abierta y vuelve a validarse al deshacer (ver `undoCoachEdit`).
 */
export const coachUndoSchema = z.discriminatedUnion('kind', [
  /** Cambiar o reemplazar: se vuelven a poner los valores anteriores de esas filas. */
  z.object({
    kind: z.literal('restore_rows'),
    rows: z
      .array(
        z.object({
          id: z.string().uuid(),
          exerciseId: z.string().uuid(),
          targetSets: z.number().int().min(1).max(20),
          targetRepsMin: intOrNull,
          targetRepsMax: intOrNull,
          rationale: strOrNull,
        }),
      )
      .min(1)
      .max(40),
  }),
  /** Sacar: se vuelven a crear las filas que se borraron. */
  z.object({
    kind: z.literal('recreate_rows'),
    rows: z
      .array(
        z.object({
          planDayId: z.string().uuid(),
          exerciseId: z.string().uuid(),
          orderIndex: z.number().int().min(0).max(200),
          targetSets: z.number().int().min(1).max(20),
          targetRepsMin: intOrNull,
          targetRepsMax: intOrNull,
          targetRir: z.number().min(0).max(10).nullable(),
          restSeconds: intOrNull,
          targetDurationSec: intOrNull,
          targetDistanceMeters: z.number().min(0).nullable(),
          notes: strOrNull,
          rationale: strOrNull,
        }),
      )
      .min(1)
      .max(40),
  }),
  /** Calorías y macros: se borra el objetivo nuevo y vuelve a estar activo el anterior. */
  z.object({
    kind: z.literal('nutrition'),
    newId: z.string().uuid(),
    previousId: z.string().uuid().nullable(),
  }),
]);
export type CoachUndo = z.infer<typeof coachUndoSchema>;

/** Un cambio sólo se ofrece si trae todo lo que hace falta para aplicarlo sin adivinar. */
export function isApplicableCoachEdit(e: CoachEdit): boolean {
  switch (e.kind) {
    case 'replace_exercise':
      return !!e.exercise && !!e.newExercise;
    case 'remove_exercise':
      return !!e.exercise;
    case 'change_exercise':
      return !!e.exercise && (e.sets != null || (e.repsMin != null && e.repsMax != null));
    case 'nutrition_targets':
      return e.kcal != null && e.proteinG != null && e.carbsG != null && e.fatG != null;
  }
}

/** Respuesta del chat: el texto y, si corresponde, un alimento, un ejercicio o un cambio a aplicar. */
export const coachReplySchema = z.object({
  reply: z.string().min(1),
  food: coachFoodSchema.nullable().catch(null),
  exercise: coachExerciseSchema.nullable().catch(null),
  edit: coachEditSchema.nullable().catch(null),
});
export type CoachReply = z.infer<typeof coachReplySchema>;
