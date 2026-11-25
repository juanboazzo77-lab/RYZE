import { describe, expect, it } from 'vitest';
import { parseDecimal, readAppData, reducers } from './data';
import type { Operation } from './protocol';
import { tokenFrom } from './session-token';

const base = {
  profile: { name: 'Ana', email: 'ana@example.com', timezone: 'America/Argentina/Buenos_Aires', unitSystem: 'METRIC', weekStart: 1, locale: 'ES' },
  weights: [
    { date: '2026-11-24', weightKg: 80, note: null },
    { date: '2026-11-20', weightKg: 81, note: null },
  ],
};
const op = (payload: unknown): Operation => ({ id: 'x', type: 'weight.log', payload, createdAt: '2026-11-25T10:00:00.000Z' });

describe('peso pendiente de subir', () => {
  const add = reducers['weight.log']!;
  it('agrega un día nuevo en su lugar', () => {
    const out = add(base, op({ date: '2026-11-22', weightKg: 80.5 }));
    expect(readAppData(out)!.weights.map((w) => w.date)).toEqual(['2026-11-24', '2026-11-22', '2026-11-20']);
  });
  it('reemplaza el mismo día y aplicarlo dos veces no duplica', () => {
    const change = op({ date: '2026-11-24', weightKg: 79, note: 'en ayunas' });
    const twice = add(add(base, change), change);
    expect(readAppData(twice)!.weights).toEqual([
      { date: '2026-11-24', weightKg: 79, note: 'en ayunas' },
      { date: '2026-11-20', weightKg: 81, note: null },
    ]);
  });
  it('ignora algo con otra forma', () => {
    expect(add(base, op({ peso: 3 }))).toBe(base);
  });
});

describe('datos guardados', () => {
  it('sin datos o incompletos no muestra nada a medias', () => {
    expect(readAppData({})).toBeNull();
    expect(readAppData({ weights: [] })).toBeNull();
    expect(readAppData(base)).not.toBeNull();
  });
  it('lee números con coma o punto', () => {
    expect([parseDecimal('78,4'), parseDecimal(' 78.45 '), parseDecimal('80')]).toEqual([78.4, 78.45, 80]);
    for (const bad of ['', 'abc', '78,4,1', '-5', '1e3', '78.']) expect(parseDecimal(bad)).toBeNull();
  });
});

describe('sesión', () => {
  const none = { session: null };
  it('devuelve la sesión vigente', () => {
    expect(tokenFrom({ data: { session: { access_token: 't' } }, error: null })).toBe('t');
  });
  it('sin señal para renovarla es un problema de conexión: no se cierra la sesión', () => {
    for (const error of [{ name: 'AuthRetryableFetchError', status: 0 }, { status: 503 }, { status: 429 }, {}]) {
      expect(() => tokenFrom({ data: none, error })).toThrow('SIN_CONEXION');
    }
  });
  it('si dejó de valer o no hay, pide volver a entrar', () => {
    expect(tokenFrom({ data: none, error: null })).toBeNull();
    expect(tokenFrom({ data: none, error: { name: 'AuthApiError', status: 400 } })).toBeNull();
  });
});
