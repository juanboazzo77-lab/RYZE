import { describe, it, expect } from 'vitest';
import { extractProductCode } from './barcode-scanner';

describe('extractProductCode', () => {
  it('código de barras: sólo dígitos', () => {
    expect(extractProductCode('7790895000102', false)).toBe('7790895000102');
    expect(extractProductCode('123', false)).toBeNull();
  });
  it('QR con GS1 Digital Link', () => {
    expect(extractProductCode('https://id.gs1.org/01/07790895000102/10/ABC', true)).toBe('07790895000102');
    expect(extractProductCode('https://example.com/product/7790895000102?x=1', true)).toBe('7790895000102');
  });
  it('QR con el número suelto o dentro de texto', () => {
    expect(extractProductCode('7790895000102', true)).toBe('7790895000102');
    expect(extractProductCode('EAN: 7790895000102 lote 5', true)).toBe('7790895000102');
  });
  it('QR sin código de producto no devuelve nada', () => {
    expect(extractProductCode('https://menu.example.com/mesa/12', true)).toBeNull();
    expect(extractProductCode('hola', true)).toBeNull();
  });
});
