import { describe, expect, it } from 'vitest';
import { asCurrency, formatMoney, formatMoneyMap, priceLimit, DEFAULT_PRICE_ARS } from './money';

describe('plata de los gimnasios', () => {
  it('el precio por defecto de Argentina es $5.000 por socio', () => {
    expect(DEFAULT_PRICE_ARS).toBe(5000);
    expect(formatMoney(DEFAULT_PRICE_ARS, 'ARS')).toBe('$5.000');
  });
  it('pesos y dólares se escriben distinto', () => {
    expect(formatMoney(1250000, 'ARS')).toBe('$1.250.000');
    expect(formatMoney(1.5, 'USD')).toBe('US$ 1,5');
  });
  it('un resumen muestra solo las monedas que tienen plata', () => {
    expect(formatMoneyMap({ ARS: 40000, USD: 0 })).toBe('$40.000');
    expect(formatMoneyMap({ ARS: 40000, USD: 3 })).toBe('$40.000 · US$ 3');
    expect(formatMoneyMap({ ARS: 0, USD: 0 })).toBe('$0');
  });
  it('lo que no es USD cuenta como pesos', () => {
    expect(asCurrency('USD')).toBe('USD');
    expect(asCurrency('ARS')).toBe('ARS');
    expect(asCurrency(null)).toBe('ARS');
    expect(asCurrency('EUR')).toBe('ARS');
  });
  it('el tope del precio depende de la moneda', () => {
    expect(priceLimit('ARS')).toBeGreaterThan(priceLimit('USD'));
  });
});
