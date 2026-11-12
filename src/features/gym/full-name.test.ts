import { describe, expect, it } from 'vitest';
import { cleanFullName, isFullName } from './full-name';

describe('nombre completo', () => {
  it('acepta nombre y apellido', () => {
    expect(isFullName('Ana Pérez')).toBe(true);
    expect(isFullName('  juan   carlos  boazzo ')).toBe(true);
    expect(isFullName("María D'Angelo")).toBe(true);
  });

  it('rechaza una sola palabra, mails, números y vacíos', () => {
    expect(isFullName('Ana')).toBe(false);
    expect(isFullName('ana@gmail.com')).toBe(false);
    expect(isFullName('Ana 123')).toBe(false);
    expect(isFullName('A B')).toBe(false);
    expect(isFullName('')).toBe(false);
    expect(isFullName(null)).toBe(false);
  });

  it('limpia los espacios', () => {
    expect(cleanFullName('  Ana   Pérez ')).toBe('Ana Pérez');
    expect(cleanFullName(undefined)).toBe('');
  });
});
