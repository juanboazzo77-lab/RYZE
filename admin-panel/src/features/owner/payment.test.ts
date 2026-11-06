import { describe, expect, it } from 'vitest';
import { isCbu, normalizeAmount, normalizePaymentAlias, normalizePaymentLink } from './payment';

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

describe('valor en pesos', () => {
  it('entiende los formatos que escribe la gente', () => {
    expect(normalizeAmount('5000')).toBe(5000);
    expect(normalizeAmount('5.000')).toBe(5000);
    expect(normalizeAmount('12.500,50')).toBe(12500.5);
    expect(normalizeAmount('5000,5')).toBe(5000.5);
    expect(normalizeAmount(' 7500 ')).toBe(7500);
    expect(normalizeAmount(8000)).toBe(8000);
  });
  it('rechaza vacíos, negativos, letras y cifras absurdas', () => {
    expect(normalizeAmount('')).toBeNull();
    expect(normalizeAmount(null)).toBeNull();
    expect(normalizeAmount('0')).toBeNull();
    expect(normalizeAmount('-5')).toBeNull();
    expect(normalizeAmount('cinco mil')).toBeNull();
    expect(normalizeAmount('$5000')).toBeNull();
    expect(normalizeAmount('999999999')).toBeNull();
  });
});
