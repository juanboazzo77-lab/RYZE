import { describe, expect, it } from 'vitest';
import { reminderMessage, whatsappLink, whatsappNumber } from './whatsapp';

describe('whatsappNumber', () => {
  it.each([
    ['11 5555-1234', '5491155551234'],
    ['+54 9 11 5555-1234', '5491155551234'],
    ['+54 11 5555-1234', '5491155551234'],
    ['011 15 5555-1234', '5491155551234'],
    ['5491155551234', '5491155551234'],
    ['(0221) 15-456-7890', '5492214567890'],
  ])('%s → %s', (input, expected) => {
    expect(whatsappNumber(input)).toBe(expected);
  });

  it('devuelve null si no se entiende', () => {
    expect(whatsappNumber('')).toBeNull();
    expect(whatsappNumber('abc')).toBeNull();
    expect(whatsappNumber('123')).toBeNull();
    expect(whatsappNumber('+1 202 555 0188 99')).toBeNull();
  });
});

describe('reminderMessage', () => {
  it('dice si vence hoy, está vencida o vence pronto, con el primer nombre', () => {
    expect(reminderMessage({ name: 'Ana Pérez', gymName: 'Gym Norte', daysLeft: 0 })).toContain('Hola Ana! Te escribo de Gym Norte: hoy vence tu cuota');
    expect(reminderMessage({ name: 'Ana', gymName: 'G', daysLeft: -1 })).toContain('venció hace 1 día');
    expect(reminderMessage({ name: 'Ana', gymName: 'G', daysLeft: -4 })).toContain('venció hace 4 días');
    expect(reminderMessage({ name: 'Ana', gymName: 'G', daysLeft: 3 })).toContain('vence en 3 días');
  });
});

describe('whatsappLink', () => {
  it('arma el enlace con el texto escapado', () => {
    const link = whatsappLink('11 5555-1234', 'Hola Ana! ¿Cómo estás?')!;
    expect(link.startsWith('https://wa.me/5491155551234?text=')).toBe(true);
    expect(link).toContain(encodeURIComponent('¿Cómo'));
  });
  it('sin teléfono o con uno inválido no hay enlace', () => {
    expect(whatsappLink(null, 'x')).toBeNull();
    expect(whatsappLink('12', 'x')).toBeNull();
  });
});
