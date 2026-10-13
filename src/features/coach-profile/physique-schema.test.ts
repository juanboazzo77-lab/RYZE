import { describe, it, expect } from 'vitest';
import { hasUsefulContent, physiqueAnalysisSchema } from './physique-schema';

describe('physiqueAnalysisSchema', () => {
  it('acepta un informe completo', () => {
    const r = physiqueAnalysisSchema.parse({
      bodyFatEstimate: '18-22%',
      bodyFatConfidence: 'alta',
      summary: 'Buen punto de partida.',
      muscleBalance: [{ group: 'hombros', level: 'rezagado', note: 'Deltoide lateral plano' }],
      posture: 'Hombros parejos.',
      strengths: ['Espalda ancha'],
      weakPoints: 'Hombros y brazos.',
      recommendations: [{ area: 'nutricion', text: 'Subí la proteína a 1,8 g/kg.' }],
      photoTips: 'Misma luz.',
    });
    expect(r.muscleBalance[0]?.level).toBe('rezagado');
    expect(hasUsefulContent(r)).toBe(true);
  });

  it('recorta y completa en vez de rechazar', () => {
    const r = physiqueAnalysisSchema.parse({
      bodyFatEstimate: 'x'.repeat(200),
      bodyFatConfidence: 'altísima',
      muscleBalance: [{ group: 'pecho', level: 'raro' }, { group: '' }],
      recommendations: [{ area: 'inventada', text: 'Hacé algo' }, 5],
      strengths: 'no es un array',
    });
    expect(r.bodyFatEstimate.length).toBe(60);
    expect(r.bodyFatConfidence).toBe('media');
    expect(r.muscleBalance).toEqual([{ group: 'pecho', level: 'equilibrado', note: '' }]);
    expect(r.recommendations[0]?.area).toBe('entrenamiento');
    expect(r.strengths).toEqual([]);
  });

  it('un informe vacío no tiene contenido útil', () => {
    expect(hasUsefulContent(physiqueAnalysisSchema.parse({}))).toBe(false);
  });

  it('con sólo consejos de foto sí es útil (foto inservible)', () => {
    expect(hasUsefulContent(physiqueAnalysisSchema.parse({ photoTips: 'Más luz y de cuerpo entero.' }))).toBe(true);
  });
});
