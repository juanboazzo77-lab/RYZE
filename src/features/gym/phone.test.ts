import { describe, expect, it } from 'vitest';
import { cleanPhone, isValidPhone, phoneKey } from './phone';

describe('teléfonos', () => {
  it('limpia lo que escribe la persona', () => {
    expect(cleanPhone(' 11  5555-1234 ')).toBe('11 5555-1234');
    expect(cleanPhone('tel: +54 9 11 5555 1234')).toBe('+54 9 11 5555 1234');
    expect(cleanPhone(null)).toBe('');
  });

  it('valida por cantidad de dígitos', () => {
    expect(isValidPhone('11 5555-1234')).toBe(true);
    expect(isValidPhone('1234')).toBe(false);
    expect(isValidPhone('1'.repeat(16))).toBe(false);
    expect(isValidPhone('hola')).toBe(false);
  });

  it('el mismo número escrito distinto da la misma clave', () => {
    const base = phoneKey('11 5555-1234');
    expect(base).toBe('1155551234');
    expect(phoneKey('+54 9 11 5555 1234')).toBe(base);
    expect(phoneKey('011 5555-1234')).toBe(base);
    expect(phoneKey('(011) 15 5555-1234')).toBe(base);
    expect(phoneKey('5491155551234')).toBe(base);
  });

  it('números distintos dan claves distintas y lo que no alcanza no tiene clave', () => {
    expect(phoneKey('11 5555-1234')).not.toBe(phoneKey('11 5555-1235'));
    expect(phoneKey('123')).toBeNull();
    expect(phoneKey('')).toBeNull();
  });
});
