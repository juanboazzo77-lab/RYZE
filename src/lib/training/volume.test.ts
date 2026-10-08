import { describe, it, expect } from 'vitest';
import { guessPrimary, inferSecondary, summarizeVolume } from './volume';

describe('inferSecondary', () => {
  it('el press de pecho suma tríceps y hombros', () => {
    expect(inferSecondary('Press de banca', 'CHEST')).toEqual(['TRICEPS', 'SHOULDERS']);
  });
  it('los aislados no tienen secundarios', () => {
    expect(inferSecondary('Aperturas en polea', 'CHEST')).toEqual([]);
    expect(inferSecondary('Elevaciones laterales', 'SHOULDERS')).toEqual([]);
    expect(inferSecondary('Extensión de cuádriceps', 'QUADS')).toEqual([]);
  });
  it('remos suman bíceps y trapecio; jalones solo bíceps', () => {
    expect(inferSecondary('Remo con barra', 'BACK')).toEqual(['BICEPS', 'TRAPS']);
    expect(inferSecondary('Jalón al pecho', 'BACK')).toEqual(['BICEPS']);
  });
  it('sentadilla suma glúteos; peso muerto rumano suma glúteos y espalda', () => {
    expect(inferSecondary('Sentadilla', 'QUADS')).toEqual(['GLUTES']);
    expect(inferSecondary('Peso muerto rumano', 'HAMSTRINGS')).toEqual(['GLUTES', 'BACK']);
  });
});

describe('guessPrimary', () => {
  it('reconoce ejercicios comunes con acentos', () => {
    expect(guessPrimary('Elevación de talones')).toBe('CALVES');
    expect(guessPrimary('Jalón al pecho')).toBe('BACK');
    expect(guessPrimary('Sentadilla búlgara')).toBe('QUADS');
    expect(guessPrimary('Algo raro')).toBe('OTHER');
  });
});

describe('summarizeVolume', () => {
  it('separa series principales y secundarias por grupo', () => {
    const rows = summarizeVolume([
      { primary: 'CHEST', secondary: ['TRICEPS', 'SHOULDERS'], sets: 4, countable: true },
      { primary: 'CHEST', secondary: ['TRICEPS', 'SHOULDERS'], sets: 3, countable: true },
      { primary: 'TRICEPS', secondary: [], sets: 3, countable: true },
    ]);
    const chest = rows.find((r) => r.muscle === 'CHEST')!;
    const triceps = rows.find((r) => r.muscle === 'TRICEPS')!;
    const shoulders = rows.find((r) => r.muscle === 'SHOULDERS')!;
    expect(chest).toMatchObject({ primarySets: 7, primaryExercises: 2, secondarySets: 0 });
    expect(triceps).toMatchObject({
      primarySets: 3,
      primaryExercises: 1,
      secondarySets: 7,
      secondaryExercises: 2,
    });
    expect(shoulders).toMatchObject({ primarySets: 0, secondarySets: 7, secondaryExercises: 2 });
  });

  it('ignora cardio, series en cero y el grupo "otro"', () => {
    const rows = summarizeVolume([
      { primary: 'OTHER', secondary: [], sets: 1, countable: true },
      { primary: 'QUADS', secondary: ['GLUTES'], sets: 3, countable: false },
      { primary: 'BACK', secondary: [], sets: 0, countable: true },
    ]);
    expect(rows).toEqual([]);
  });

  it('ordena de mayor a menor volumen total', () => {
    const rows = summarizeVolume([
      { primary: 'BICEPS', secondary: [], sets: 3, countable: true },
      { primary: 'BACK', secondary: ['BICEPS'], sets: 5, countable: true },
    ]);
    expect(rows.map((r) => r.muscle)).toEqual(['BICEPS', 'BACK']);
  });
});
