import { describe, expect, it } from 'vitest';
import { buildCheckinSummary } from './summary';

describe('buildCheckinSummary', () => {
  it('es: incluye entrenos, peso, adherencia', () => {
    const text = buildCheckinSummary(
      {
        workoutsCompleted: 4,
        workoutsPlanned: 4,
        weightChangeKg: -0.4,
        kcalAdherencePct: 92,
        proteinAdherencePct: 88,
      },
      'ES',
    );
    expect(text).toContain('4/4 entrenamientos');
    expect(text).toContain('bajó 0.4 kg');
    expect(text).toContain('92%');
    expect(text).toContain('88%');
  });

  it('es: peso estable cuando el cambio es chico', () => {
    const text = buildCheckinSummary(
      { workoutsCompleted: 2, workoutsPlanned: 3, weightChangeKg: 0.02, kcalAdherencePct: null, proteinAdherencePct: null },
      'ES',
    );
    expect(text).toContain('se mantuvo estable');
  });

  it('en: sube de peso', () => {
    const text = buildCheckinSummary(
      { workoutsCompleted: 3, workoutsPlanned: 3, weightChangeKg: 0.6, kcalAdherencePct: 80, proteinAdherencePct: null },
      'EN',
    );
    expect(text).toContain('3/3 workouts');
    expect(text).toContain('went up 0.6 kg');
    expect(text).toContain('80%');
  });

  it('omite líneas cuando falta data', () => {
    const text = buildCheckinSummary(
      { workoutsCompleted: 0, workoutsPlanned: 3, weightChangeKg: null, kcalAdherencePct: null, proteinAdherencePct: null },
      'ES',
    );
    expect(text).toBe('Completaste 0/3 entrenamientos esta semana.');
  });
});
