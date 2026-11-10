import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('acepta rutas del propio sitio', () => {
    expect(safeNext('/dashboard')).toBe('/dashboard');
    expect(safeNext('/g/ABCD1234')).toBe('/g/ABCD1234');
    expect(safeNext('/onboarding?x=1')).toBe('/onboarding?x=1');
  });
  it('rechaza direcciones de otros sitios', () => {
    expect(safeNext('//evil.com')).toBe('/dashboard');
    expect(safeNext('/\\evil.com')).toBe('/dashboard');
    expect(safeNext('https://evil.com')).toBe('/dashboard');
    expect(safeNext('javascript:alert(1)')).toBe('/dashboard');
    expect(safeNext('evil.com')).toBe('/dashboard');
  });
  it('rechaza saltos de línea y textos larguísimos', () => {
    expect(safeNext('/ok\r\nLocation: x')).toBe('/dashboard');
    expect(safeNext(`/${'a'.repeat(400)}`)).toBe('/dashboard');
  });
  it('sin valor usa el de respaldo', () => {
    expect(safeNext(null)).toBe('/dashboard');
    expect(safeNext(undefined, '/onboarding')).toBe('/onboarding');
    expect(safeNext('', '/x')).toBe('/x');
  });
});
