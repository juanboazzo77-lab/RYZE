import { describe, expect, it } from 'vitest';
import { isCbu, normalizePaymentAlias, normalizePaymentLink } from './payment';

describe('link de pago', () => {
  it('acepta links https', () => {
    expect(normalizePaymentLink(' https://mpago.la/2abc12 ')).toBe('https://mpago.la/2abc12');
    expect(normalizePaymentLink('https://link.mercadopago.com.ar/migym')).toBe('https://link.mercadopago.com.ar/migym');
  });
  it('rechaza lo que no es https o tiene cosas raras', () => {
    expect(normalizePaymentLink('http://mpago.la/x')).toBeNull();
    expect(normalizePaymentLink('javascript:alert(1)')).toBeNull();
    expect(normalizePaymentLink('mpago.la/x')).toBeNull();
    expect(normalizePaymentLink('https://mpago.la/x y')).toBeNull();
    expect(normalizePaymentLink('https://localhost/x')).toBeNull();
    expect(normalizePaymentLink('')).toBeNull();
    expect(normalizePaymentLink(`https://x.com/${'a'.repeat(600)}`)).toBeNull();
  });
});

describe('alias o CBU', () => {
  it('acepta un alias y lo pasa a minúsculas', () => {
    expect(normalizePaymentAlias('Mi.Gym.Norte')).toBe('mi.gym.norte');
    expect(normalizePaymentAlias(' gym-norte_1 ')).toBe('gym-norte_1');
  });
  it('acepta un CBU o CVU de 22 números', () => {
    expect(normalizePaymentAlias('0000003100012345678901')).toBe('0000003100012345678901');
    expect(isCbu('0000003100012345678901')).toBe(true);
    expect(isCbu('mi.alias.gym')).toBe(false);
  });
  it('rechaza lo que no sirve', () => {
    expect(normalizePaymentAlias('abc')).toBeNull();
    expect(normalizePaymentAlias('123456')).toBeNull();
    expect(normalizePaymentAlias('hola que tal <b>')).toBeNull();
    expect(normalizePaymentAlias('')).toBeNull();
  });
});
