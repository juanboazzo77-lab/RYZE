import { describe, it, expect } from 'vitest';
import {
  coachProfileCompletion,
  emptyCoachProfile,
  parseSection,
  saveCoachProfileSchema,
  toggleNone,
} from './schema';

describe('coach-profile schema', () => {
  it('el perfil vacío tiene 0% de completitud', () => {
    const res = coachProfileCompletion(emptyCoachProfile());
    expect(res.pct).toBe(0);
    expect(res.perSection.food.done).toBe(0);
    expect(res.perSection.food.total).toBeGreaterThan(0);
  });

  it('cuenta campos llenos y sube el porcentaje', () => {
    const cp = emptyCoachProfile();
    cp.goal.goalInWords = 'quiero bajar 5 kg sin perder fuerza';
    cp.goal.aggressiveness = 'equilibrado';
    cp.food.dietStyle = 'omnivoro';
    cp.food.favoriteFoods = ['pollo', 'arroz'];
    const res = coachProfileCompletion(cp);
    expect(res.perSection.goal.done).toBe(2);
    expect(res.perSection.food.done).toBe(2);
    expect(res.pct).toBeGreaterThan(0);
  });

  it('parseSection tolera datos inválidos o de más y no rompe', () => {
    const parsed = parseSection('training', {
      musclePriorities: ['gluteos', 'no_existe'],
      squatKg: '120',
      basura: true,
    });
    // el enum inválido descarta el array entero (fallback []), squat se castea a número
    expect(Array.isArray(parsed.musclePriorities)).toBe(true);
    expect(parsed.squatKg).toBe(120);
    expect(parsed).not.toHaveProperty('basura');
  });

  it('la Server Action completa las secciones ausentes con sus defaults', () => {
    const r = saveCoachProfileSchema.safeParse({ health: { sleepQuality: 'buena' } });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.health.sleepQuality).toBe('buena');
      expect(r.data.food.dietStyle).toBeNull();
      expect(r.data.food.favoriteFoods).toEqual([]);
    }
  });

  it('descarta valores de enum fuera de catálogo (los deja en null)', () => {
    const r = saveCoachProfileSchema.safeParse({ goal: { aggressiveness: 'imposible' } });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.goal?.aggressiveness).toBeNull();
  });

  it('toggleNone: elegir "ninguna" saca el resto', () => {
    expect(toggleNone(['rodillas'], ['rodillas', 'ninguna'], 'ninguna')).toEqual(['ninguna']);
  });

  it('toggleNone: elegir otra cosa saca "ninguna"', () => {
    expect(toggleNone(['ninguna'], ['ninguna', 'rodillas'], 'ninguna')).toEqual(['rodillas']);
  });

  it('toggleNone: sin "ninguna" de por medio, no cambia nada', () => {
    expect(toggleNone(['rodillas'], ['rodillas', 'hombros'], 'ninguna')).toEqual([
      'rodillas',
      'hombros',
    ]);
  });
});
