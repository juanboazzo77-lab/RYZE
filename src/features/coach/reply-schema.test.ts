import { describe, expect, it } from 'vitest';
import { coachReplySchema, coachUndoSchema, isApplicableCoachEdit, type CoachEdit } from './reply-schema';

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

describe('coachReplySchema', () => {
  it('un cambio con valores fuera de rango se descarta sin romper la respuesta', () => {
    const parsed = coachReplySchema.parse({
      reply: 'Dale',
      food: null,
      exercise: null,
      edits: [
        { kind: 'nutrition_targets', summary: 'Subo las calorías', kcal: 99999, proteinG: 160, carbsG: 300, fatG: 70 },
      ],
    });
    expect(parsed.reply).toBe('Dale');
    // Un número fuera de rango queda en null: el cambio no es aplicable y se descarta.
    expect(parsed.edits).toEqual([]);
  });

  it('acepta una respuesta sin el campo edits', () => {
    const parsed = coachReplySchema.parse({ reply: 'Hola', food: null, exercise: null });
    expect(parsed.edits).toEqual([]);
  });

  it('conserva varios cambios válidos y descarta los incompletos', () => {
    const parsed = coachReplySchema.parse({
      reply: 'Te armo el día',
      food: null,
      exercise: null,
      edits: [
        { kind: 'remove_exercise', summary: 'Saco el peso muerto', exercise: 'Peso muerto' },
        { kind: 'add_exercise', summary: 'Sumo sentadilla búlgara', newExercise: 'Sentadilla búlgara', day: 'Pierna' },
        { kind: 'replace_exercise', summary: 'Falta el nuevo', exercise: 'Prensa' },
        { kind: 'cualquier_cosa', summary: 'inválido' },
      ],
    });
    expect(parsed.edits.map((e) => e.kind)).toEqual(['remove_exercise', 'add_exercise']);
  });

  it('no deja pasar más de 12 cambios', () => {
    const edits = Array.from({ length: 20 }, (_, i) => ({
      kind: 'remove_exercise',
      summary: `Saco ${i}`,
      exercise: `Ejercicio ${i}`,
    }));
    expect(coachReplySchema.parse({ reply: 'x', food: null, exercise: null, edits }).edits).toHaveLength(12);
  });
});
