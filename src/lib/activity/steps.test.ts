import { describe, expect, it } from 'vitest';
import { averageSteps, stepLevel } from './steps';

describe('averageSteps', () => {
  const entries = [
    { date: '2026-09-01', steps: 4000 },
    { date: '2026-09-05', steps: 8000 },
    { date: '2026-09-07', steps: 12000 },
    { date: '2026-09-08', steps: 6000 },
  ];

  it('promedia sólo los días con registro dentro del rango', () => {
    // últimos 7 días desde 2026-09-08 => 09-02..09-08 => 8000, 12000, 6000
    expect(averageSteps(entries, '2026-09-08', 7)).toBe(Math.round((8000 + 12000 + 6000) / 3));
  });

  it('rango más amplio incluye más días', () => {
    expect(averageSteps(entries, '2026-09-08', 30)).toBe(Math.round((4000 + 8000 + 12000 + 6000) / 4));
  });

  it('sin registros en rango => null', () => {
    expect(averageSteps(entries, '2026-10-20', 7)).toBeNull();
  });
});

describe('stepLevel', () => {
  it('mapea el promedio a un nivel', () => {
    expect(stepLevel(null)).toBe('none');
    expect(stepLevel(3200)).toBe('sedentary');
    expect(stepLevel(6000)).toBe('low');
    expect(stepLevel(8200)).toBe('active');
    expect(stepLevel(11000)).toBe('high');
  });
});
