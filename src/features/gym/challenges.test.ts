import { describe, expect, it } from 'vitest';
import { challengeStatus, cleanChallenge, daysLeft, displayName, localDay, rankEntries, scoreOf } from './challenges';

describe('estado del reto', () => {
  it('antes, durante y después', () => {
    expect(challengeStatus('2026-11-10', '2026-11-30', '2026-11-09')).toBe('UPCOMING');
    expect(challengeStatus('2026-11-10', '2026-11-30', '2026-11-10')).toBe('ACTIVE');
    expect(challengeStatus('2026-11-10', '2026-11-30', '2026-11-30')).toBe('ACTIVE');
    expect(challengeStatus('2026-11-10', '2026-11-30', '2026-12-01')).toBe('ENDED');
  });
  it('días que faltan, nunca negativo', () => {
    expect(daysLeft('2026-11-30', '2026-11-20')).toBe(10);
    expect(daysLeft('2026-11-30', '2026-11-30')).toBe(0);
    expect(daysLeft('2026-11-30', '2026-12-05')).toBe(0);
  });
});

describe('nombre en el ranking', () => {
  it('nombre y la inicial del apellido', () => {
    expect(displayName('Ana Pérez')).toBe('Ana P.');
    expect(displayName('  luis   gómez  ruiz ')).toBe('luis G.');
    expect(displayName('Marta')).toBe('Marta');
    expect(displayName(null)).toBe('Socio');
    expect(displayName('')).toBe('Socio');
  });
});

describe('puntaje', () => {
  // 02:00 UTC del 11 = 23:00 del 10 en Argentina
  const d = (iso: string) => new Date(iso);
  it('usa el día de Argentina, no el de UTC', () => {
    expect(localDay(d('2026-11-11T02:00:00Z'))).toBe('2026-11-10');
  });
  it('cuenta entrenamientos dentro de las fechas', () => {
    const list = [d('2026-11-09T15:00:00Z'), d('2026-11-10T15:00:00Z'), d('2026-11-10T20:00:00Z'), d('2026-12-01T15:00:00Z')];
    expect(scoreOf('WORKOUTS', list, '2026-11-10', '2026-11-30')).toBe(2);
  });
  it('en días entrenados, dos el mismo día cuentan uno', () => {
    const list = [d('2026-11-10T15:00:00Z'), d('2026-11-10T20:00:00Z'), d('2026-11-12T15:00:00Z')];
    expect(scoreOf('DAYS', list, '2026-11-10', '2026-11-30')).toBe(2);
  });
  it('el último día del reto cuenta entero', () => {
    expect(scoreOf('WORKOUTS', [d('2026-12-01T02:00:00Z')], '2026-11-10', '2026-11-30')).toBe(1);
  });
});

describe('ranking', () => {
  it('ordena por puntaje y los empates comparten puesto', () => {
    const r = rankEntries([
      { userId: 'a', name: 'Ana', score: 5 },
      { userId: 'b', name: 'Beto', score: 9 },
      { userId: 'c', name: 'Carla', score: 5 },
      { userId: 'd', name: 'Dani', score: 1 },
    ]);
    expect(r.map((x) => [x.name, x.position])).toEqual([['Beto', 1], ['Ana', 2], ['Carla', 2], ['Dani', 4]]);
  });
  it('sin nadie, lista vacía', () => {
    expect(rankEntries([])).toEqual([]);
  });
});

describe('cleanChallenge', () => {
  const ok = { title: ' Reto de noviembre ', description: 'hola', metric: 'DAYS', startsOn: '2026-11-01', endsOn: '2026-11-30', prize: ' Un mes gratis ' };
  it('limpia y valida', () => {
    expect(cleanChallenge(ok)).toEqual({ title: 'Reto de noviembre', description: 'hola', metric: 'DAYS', startsOn: '2026-11-01', endsOn: '2026-11-30', prize: 'Un mes gratis' });
  });
  it('rechaza título corto, fechas al revés o inválidas, y duraciones enormes', () => {
    expect(cleanChallenge({ ...ok, title: 'a' })).toEqual({ error: 'TITLE' });
    expect(cleanChallenge({ ...ok, endsOn: '2026-10-01' })).toEqual({ error: 'DATES' });
    expect(cleanChallenge({ ...ok, startsOn: 'mañana' })).toEqual({ error: 'DATES' });
    expect(cleanChallenge({ ...ok, endsOn: '2027-06-30' })).toEqual({ error: 'TOO_LONG' });
  });
  it('una métrica desconocida pasa a entrenamientos', () => {
    expect((cleanChallenge({ ...ok, metric: 'X' }) as { metric: string }).metric).toBe('WORKOUTS');
  });
});

import { buildRanking } from './challenges';

describe('buildRanking', () => {
  it('cuenta a cada socio solo sus entrenamientos y pone nombre corto', () => {
    const w = (userId: string, iso: string) => ({ userId, finishedAt: new Date(iso) });
    const r = buildRanking({
      metric: 'WORKOUTS',
      startsOn: '2026-11-01',
      endsOn: '2026-11-30',
      entrants: [
        { userId: 'a', name: 'Ana Pérez' },
        { userId: 'b', name: 'Beto' },
        { userId: 'c', name: null },
      ],
      workouts: [w('a', '2026-11-03T15:00:00Z'), w('a', '2026-11-04T15:00:00Z'), w('b', '2026-11-05T15:00:00Z'), w('b', '2026-12-05T15:00:00Z'), w('zzz', '2026-11-05T15:00:00Z')],
    });
    expect(r.map((x) => [x.name, x.score, x.position])).toEqual([['Ana P.', 2, 1], ['Beto', 1, 2], ['Socio', 0, 3]]);
  });
});
