import { describe, expect, it } from 'vitest';
import { candidateCodes, parseOffMacros } from './off-parse';

describe('candidateCodes', () => {
  it('prueba el EAN-13 con cero para un UPC-A de 12 dígitos', () => {
    expect(candidateCodes('036000291452')).toEqual(['036000291452', '0036000291452']);
  });
  it('prueba sin el cero inicial un EAN-13 que empieza con 0', () => {
    expect(candidateCodes('0036000291452')).toEqual(['0036000291452', '036000291452']);
  });
  it('un EAN-13 normal queda como está', () => {
    expect(candidateCodes('7790895000997')).toEqual(['7790895000997']);
  });
  it('un GTIN-14 prueba el EAN-13 que contiene', () => {
    expect(candidateCodes('17790895000994')).toContain('7790895000994');
  });
});

describe('parseOffMacros', () => {
  it('usa las kcal por 100 g cuando están', () => {
    const m = parseOffMacros({ 'energy-kcal_100g': 250, proteins_100g: 10, carbohydrates_100g: 30, fat_100g: 9 });
    expect(m).toEqual({ kcalPer100: 250, proteinPer100: 10, carbsPer100: 30, fatPer100: 9 });
  });

  it('convierte kJ a kcal', () => {
    const m = parseOffMacros({ energy_100g: 1046, proteins_100g: 5 });
    expect(m?.kcalPer100).toBe(250);
  });

  it('calcula las kcal desde los macros si falta la energía', () => {
    const m = parseOffMacros({ proteins_100g: 10, carbohydrates_100g: 20, fat_100g: 5 });
    expect(m?.kcalPer100).toBe(165); // 40 + 80 + 45
  });

  it('reconstruye por 100 g desde los valores por porción', () => {
    const m = parseOffMacros(
      { 'energy-kcal_serving': 100, proteins_serving: 5, carbohydrates_serving: 10, fat_serving: 4 },
      50,
    );
    expect(m).toEqual({ kcalPer100: 200, proteinPer100: 10, carbsPer100: 20, fatPer100: 8 });
  });

  it('acepta un producto de 0 kcal (gaseosa sin azúcar)', () => {
    const m = parseOffMacros({ 'energy-kcal_100g': 0, carbohydrates_100g: 0, fat_100g: 0, proteins_100g: 0 });
    expect(m).toEqual({ kcalPer100: 0, proteinPer100: 0, carbsPer100: 0, fatPer100: 0 });
  });

  it('devuelve null si no hay ningún dato', () => {
    expect(parseOffMacros({})).toBeNull();
    expect(parseOffMacros({ salt_100g: 1 })).toBeNull();
  });
});
