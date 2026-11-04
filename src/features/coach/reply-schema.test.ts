import { describe, expect, it } from 'vitest';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { coachEditsToolSchema, coachReplySchema, coachUndoSchema, isApplicableCoachEdit, type CoachEdit } from './reply-schema';

const base: CoachEdit = {
  kind: 'replace_exercise',
  summary: 'Cambio el press de banca por press inclinado',
  exercise: null,
  day: null,
  newExercise: null,
  type: 'STRENGTH',
  sets: null,
  repsMin: null,
  repsMax: null,
  kcal: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
  foodName: null,
  newFoodName: null,
  meal: null,
  amount: null,
  kcalPer100: null,
  proteinPer100: null,
  carbsPer100: null,
  fatPer100: null,
};

describe('isApplicableCoachEdit', () => {
  it('reemplazar necesita el ejercicio actual y el nuevo', () => {
    expect(isApplicableCoachEdit(base)).toBe(false);
    expect(isApplicableCoachEdit({ ...base, exercise: 'Press de banca' })).toBe(false);
    expect(isApplicableCoachEdit({ ...base, exercise: 'Press de banca', newExercise: 'Press inclinado' })).toBe(true);
  });

  it('sacar necesita sólo el ejercicio actual', () => {
    expect(isApplicableCoachEdit({ ...base, kind: 'remove_exercise' })).toBe(false);
    expect(isApplicableCoachEdit({ ...base, kind: 'remove_exercise', exercise: 'Sentadilla' })).toBe(true);
  });

  it('cambiar series o repeticiones necesita al menos un dato, y las reps van las dos', () => {
    const e = { ...base, kind: 'change_exercise' as const, exercise: 'Sentadilla' };
    expect(isApplicableCoachEdit(e)).toBe(false);
    expect(isApplicableCoachEdit({ ...e, sets: 4 })).toBe(true);
    expect(isApplicableCoachEdit({ ...e, repsMin: 8 })).toBe(false);
    expect(isApplicableCoachEdit({ ...e, repsMin: 8, repsMax: 12 })).toBe(true);
  });

  it('agregar un ejercicio necesita sólo el nombre del nuevo', () => {
    expect(isApplicableCoachEdit({ ...base, kind: 'add_exercise' })).toBe(false);
    expect(isApplicableCoachEdit({ ...base, kind: 'add_exercise', newExercise: 'Remo con barra' })).toBe(true);
  });

  it('la comida de hoy: agregar y reemplazar traen el alimento nuevo completo', () => {
    const food = {
      newFoodName: 'Arroz cocido',
      amount: 150,
      kcalPer100: 130,
      proteinPer100: 2.7,
      carbsPer100: 28,
      fatPer100: 0.3,
    };
    expect(isApplicableCoachEdit({ ...base, kind: 'add_food' })).toBe(false);
    expect(isApplicableCoachEdit({ ...base, kind: 'add_food', ...food })).toBe(true);
    expect(isApplicableCoachEdit({ ...base, kind: 'add_food', ...food, kcalPer100: null })).toBe(false);
    expect(isApplicableCoachEdit({ ...base, kind: 'replace_food', ...food })).toBe(false);
    expect(isApplicableCoachEdit({ ...base, kind: 'replace_food', ...food, foodName: 'Pollo' })).toBe(true);
  });

  it('la comida de hoy: cambiar la cantidad y sacar piden el alimento', () => {
    expect(isApplicableCoachEdit({ ...base, kind: 'change_food', amount: 200 })).toBe(false);
    expect(isApplicableCoachEdit({ ...base, kind: 'change_food', foodName: 'Pollo', amount: 200 })).toBe(true);
    expect(isApplicableCoachEdit({ ...base, kind: 'remove_food' })).toBe(false);
    expect(isApplicableCoachEdit({ ...base, kind: 'remove_food', foodName: 'Pollo' })).toBe(true);
  });

  it('los objetivos de nutrición necesitan calorías y los tres macros', () => {
    const e = { ...base, kind: 'nutrition_targets' as const, kcal: 2500, proteinG: 160, carbsG: 300 };
    expect(isApplicableCoachEdit(e)).toBe(false);
    expect(isApplicableCoachEdit({ ...e, fatG: 70 })).toBe(true);
  });
});

describe('coachUndoSchema', () => {
  const id = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';

  it('acepta cómo volver atrás cada tipo de cambio', () => {
    expect(
      coachUndoSchema.safeParse({
        kind: 'restore_rows',
        rows: [{ id, exerciseId: id, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, rationale: null }],
      }).success,
    ).toBe(true);
    expect(coachUndoSchema.safeParse({ kind: 'nutrition', newId: id, previousId: null }).success).toBe(true);
    expect(coachUndoSchema.safeParse({ kind: 'delete_rows', ids: [id] }).success).toBe(true);
    expect(coachUndoSchema.safeParse({ kind: 'delete_food', ids: [id] }).success).toBe(true);
    expect(
      coachUndoSchema.safeParse({
        kind: 'recreate_food',
        rows: [
          {
            date: '2026-11-03',
            mealType: 'LUNCH',
            foodId: null,
            customName: 'Pollo',
            quantity: 200,
            unit: 'g',
            kcal: 330,
            proteinG: 62,
            carbsG: 0,
            fatG: 7,
            isEstimated: true,
            position: 0,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it('rechaza ids inventados y listas vacías', () => {
    expect(coachUndoSchema.safeParse({ kind: 'nutrition', newId: 'x', previousId: null }).success).toBe(false);
    expect(coachUndoSchema.safeParse({ kind: 'restore_rows', rows: [] }).success).toBe(false);
    expect(coachUndoSchema.safeParse({ kind: 'otra_cosa' }).success).toBe(false);
  });

  it('acepta varios deshacer juntos', () => {
    expect(
      coachUndoSchema.safeParse({
        kind: 'batch',
        undos: [
          { kind: 'delete_rows', ids: [id] },
          { kind: 'nutrition', newId: id, previousId: null },
        ],
      }).success,
    ).toBe(true);
    expect(coachUndoSchema.safeParse({ kind: 'batch', undos: [] }).success).toBe(false);
  });
});

/** Un cambio en el formato que ve la IA: todos los campos, "" o 0 cuando no aplican. */
const wire = (o: Record<string, unknown>) => ({
  kind: 'remove_exercise',
  summary: 'Cambio',
  target: '',
  newName: '',
  day: '',
  meal: 'NONE',
  type: 'STRENGTH',
  sets: 0,
  repsMin: 0,
  repsMax: 0,
  amount: 0,
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  ...o,
});

describe('coachEditsToolSchema', () => {
  it('un cambio con valores fuera de rango se descarta sin romper la respuesta', () => {
    const parsed = coachEditsToolSchema.parse({
      reply: 'Dale',
      food: null,
      exercise: null,
      edits: [wire({ kind: 'nutrition_targets', summary: 'Subo las calorías', kcal: 99999, protein: 160, carbs: 300, fat: 70 })],
    });
    expect(parsed.reply).toBe('Dale');
    expect(parsed.edits).toEqual([]);
  });

  it('traduce los campos de la IA al cambio que se aplica', () => {
    const parsed = coachEditsToolSchema.parse({
      reply: 'ok',
      food: null,
      exercise: null,
      edits: [
        wire({ kind: 'nutrition_targets', summary: 'Subo calorías', kcal: 2800, protein: 170, carbs: 330, fat: 80 }),
        wire({ kind: 'add_food', summary: 'Sumo arroz', newName: 'Arroz cocido', amount: 150, meal: 'LUNCH', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 }),
        wire({ kind: 'change_food', summary: 'Pollo a 250 g', target: 'Pollo a la plancha', amount: 250 }),
        wire({ kind: 'replace_exercise', summary: 'Prensa por hack', target: 'Prensa de piernas', newName: 'Sentadilla hack', sets: 4, repsMin: 6, repsMax: 10, day: 'Lunes' }),
      ],
    });
    const [targets, add, change, replace] = parsed.edits;
    expect(targets).toMatchObject({ kind: 'nutrition_targets', kcal: 2800, proteinG: 170, carbsG: 330, fatG: 80, exercise: null });
    expect(add).toMatchObject({ kind: 'add_food', newFoodName: 'Arroz cocido', amount: 150, meal: 'LUNCH', kcalPer100: 130, carbsPer100: 28 });
    expect(change).toMatchObject({ kind: 'change_food', foodName: 'Pollo a la plancha', amount: 250, meal: null });
    expect(replace).toMatchObject({ kind: 'replace_exercise', exercise: 'Prensa de piernas', newExercise: 'Sentadilla hack', sets: 4, repsMin: 6, repsMax: 10, day: 'Lunes' });
  });

  it('conserva varios cambios válidos y descarta los incompletos', () => {
    const parsed = coachEditsToolSchema.parse({
      reply: 'Te armo el día',
      food: null,
      exercise: null,
      edits: [
        wire({ kind: 'remove_exercise', summary: 'Saco el peso muerto', target: 'Peso muerto' }),
        wire({ kind: 'add_exercise', summary: 'Sumo sentadilla búlgara', newName: 'Sentadilla búlgara', day: 'Pierna' }),
        wire({ kind: 'replace_exercise', summary: 'Falta el nuevo', target: 'Prensa' }),
      ],
    });
    expect(parsed.edits.map((e) => e.kind)).toEqual(['remove_exercise', 'add_exercise']);
  });

  it('no deja pasar más de 12 cambios', () => {
    const edits = Array.from({ length: 20 }, (_, i) => wire({ summary: `Saco ${i}`, target: `Ejercicio ${i}` }));
    expect(coachEditsToolSchema.parse({ reply: 'x', food: null, exercise: null, edits }).edits).toHaveLength(12);
  });
});

describe('formato para la IA', () => {
  const json = (schema: Parameters<typeof zodToJsonSchema>[0]) =>
    zodToJsonSchema(schema, { target: 'jsonSchema7', $refStrategy: 'none' }) as {
      properties: Record<string, { items?: { required: string[]; properties: Record<string, unknown> } }>;
    };

  // Anthropic rechaza los esquemas con muchos campos opcionales o que pueden ser nulos (~16):
  // el chat estructurado tiene que quedar chico.
  it('el chat estructurado no supera los límites de campos opcionales ni nulos', () => {
    const text = JSON.stringify(json(coachReplySchema));
    const nullable = (text.match(/"type":\["[a-z]+","null"\]|"type":"null"/g) ?? []).length;
    expect(nullable).toBeLessThanOrEqual(8);
    expect(Object.keys(json(coachReplySchema).properties)).toEqual(['reply', 'food', 'exercise']);
  });

  it('la herramienta de cambios pide todos los campos de cada cambio', () => {
    const item = json(coachEditsToolSchema).properties.edits!.items!;
    expect([...item.required].sort()).toEqual(Object.keys(item.properties).sort());
  });
});
