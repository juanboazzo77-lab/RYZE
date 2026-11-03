import { describe, expect, it } from 'vitest';
import { coachReplySchema, isApplicableCoachEdit, type CoachEdit } from './reply-schema';

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

  it('los objetivos de nutrición necesitan calorías y los tres macros', () => {
    const e = { ...base, kind: 'nutrition_targets' as const, kcal: 2500, proteinG: 160, carbsG: 300 };
    expect(isApplicableCoachEdit(e)).toBe(false);
    expect(isApplicableCoachEdit({ ...e, fatG: 70 })).toBe(true);
  });
});

describe('coachReplySchema', () => {
  it('un cambio con valores fuera de rango se descarta sin romper la respuesta', () => {
    const parsed = coachReplySchema.parse({
      reply: 'Dale',
      food: null,
      exercise: null,
      edit: { kind: 'nutrition_targets', summary: 'Subo las calorías', kcal: 99999, proteinG: 160, carbsG: 300, fatG: 70 },
    });
    expect(parsed.reply).toBe('Dale');
    // Un número fuera de rango queda en null (y entonces el cambio no es aplicable).
    expect(parsed.edit && isApplicableCoachEdit(parsed.edit)).toBeFalsy();
  });

  it('acepta una respuesta sin el campo edit', () => {
    const parsed = coachReplySchema.parse({ reply: 'Hola', food: null, exercise: null });
    expect(parsed.edit).toBeNull();
  });
});
