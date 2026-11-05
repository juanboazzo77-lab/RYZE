import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./db', () => ({ prisma: {} }));

import { fingerprintOf, isNoise, normalizeForGrouping } from './app-errors';

describe('registro de errores', () => {
  it('agrupa el mismo error aunque cambie el id', () => {
    const a = fingerprintOf({ source: 'server', message: 'No existe el plan 3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90', path: 'GET /plan/3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90' });
    const b = fingerprintOf({ source: 'server', message: 'No existe el plan 11111111-2222-3333-4444-555555555555', path: 'GET /plan/11111111-2222-3333-4444-555555555555' });
    expect(a).toBe(b);
  });

  it('separa errores distintos o de otro origen', () => {
    const base = { message: 'Boom', path: '/x' };
    expect(fingerprintOf({ source: 'server', ...base })).not.toBe(fingerprintOf({ source: 'client', ...base }));
    expect(fingerprintOf({ source: 'server', message: 'A', path: '/x' })).not.toBe(
      fingerprintOf({ source: 'server', message: 'B', path: '/x' }),
    );
  });

  it('cambia los números largos por un marcador', () => {
    expect(normalizeForGrouping('falló el pedido 482201')).toBe('falló el pedido :n');
  });

  it('ignora el ruido interno de Next', () => {
    expect(isNoise('NEXT_REDIRECT')).toBe(true);
    expect(isNoise('NEXT_NOT_FOUND')).toBe(true);
    expect(isNoise('Cannot read properties of undefined')).toBe(false);
  });
});
