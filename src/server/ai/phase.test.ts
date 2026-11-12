import { describe, expect, it } from 'vitest';
import { nutritionPhase, phaseContextLines, weekLoadContextLines } from './phase';

describe('fase nutricional', () => {
  it('sale del objetivo del usuario', () => {
    expect(nutritionPhase({ primaryGoal: 'LOSE_FAT' })).toBe('CUT');
    expect(nutritionPhase({ primaryGoal: 'GAIN_MUSCLE' })).toBe('BULK');
    expect(nutritionPhase({ primaryGoal: 'RECOMP' })).toBe('RECOMP');
    expect(nutritionPhase({ primaryGoal: 'MAINTAIN' })).toBe('MAINTAIN');
  });

  it('la meta activa manda sobre el objetivo general', () => {
    expect(nutritionPhase({ goalType: 'LOSE_FAT', primaryGoal: 'GAIN_MUSCLE' })).toBe('CUT');
  });

  it('en fuerza o rendimiento, un ritmo de peso marcado define si es definición o volumen', () => {
    expect(nutritionPhase({ primaryGoal: 'STRENGTH', weeklyRateKg: -0.4 })).toBe('CUT');
    expect(nutritionPhase({ primaryGoal: 'PERFORMANCE', weeklyRateKg: 0.3 })).toBe('BULK');
    expect(nutritionPhase({ primaryGoal: 'STRENGTH', weeklyRateKg: 0.05 })).toBe('MAINTAIN');
  });

  it('sin objetivo definido no se inventa una fase', () => {
    expect(nutritionPhase({ primaryGoal: 'UNDECIDED' })).toBeNull();
    expect(nutritionPhase({})).toBeNull();
    expect(phaseContextLines(null)).toEqual([]);
  });

  it('cada fase explica qué cambia en el entrenamiento y en la comida', () => {
    const cut = phaseContextLines('CUT').join('\n');
    const bulk = phaseContextLines('BULK').join('\n');
    expect(cut).toContain('DEFINICIÓN');
    expect(cut).toContain('Entrenamiento en esta fase');
    expect(cut).toContain('Alimentación en esta fase');
    expect(bulk).toContain('VOLUMEN');
    expect(bulk).not.toEqual(cut);
  });
});

describe('carga de la semana', () => {
  const sports = [
    { name: 'Fútbol', sessionsPerWeek: 2, sessionDays: [2, 6] },
    { name: 'Tenis', sessionsPerWeek: 1, sessionDays: [4] },
  ];

  it('cuenta fuerza y deportes y avisa si hoy hay deporte', () => {
    const l = weekLoadContextLines({ gymDaysPerWeek: 3, sports, todayWeekday: 2 });
    expect(l[0]).toBe('Carga de la semana: 3 días de fuerza + 3 sesiones de deporte (Fútbol, Tenis).');
    expect(l[1]).toContain('Hoy es martes');
    expect(l[1]).toContain('tiene deporte hoy (Fútbol)');
  });

  it('un día sin deporte lo dice', () => {
    const l = weekLoadContextLines({ gymDaysPerWeek: 4, sports, todayWeekday: 3 });
    expect(l[1]).toContain('Hoy es miércoles');
    expect(l[1]).toContain('no tiene deporte cargado para hoy');
  });

  it('sin deportes, solo fuerza', () => {
    const l = weekLoadContextLines({ gymDaysPerWeek: 3, sports: [], todayWeekday: 1 });
    expect(l[0]).toBe('Carga de la semana: 3 días de fuerza + 0 sesiones de deporte.');
  });
});
