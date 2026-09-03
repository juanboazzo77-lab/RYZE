/**
 * Conversión de unidades. El almacenamiento es siempre métrico (kg, cm); estas
 * funciones sólo convierten para presentación/entrada según `unitSystem`.
 */
import type { UnitSystem } from '@prisma/client';

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}
export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}
export function cmToIn(cm: number): number {
  return cm / CM_PER_IN;
}
export function inToCm(inch: number): number {
  return inch * CM_PER_IN;
}

/** cm → { ft, in } redondeado a pulgada. */
export function cmToFtIn(cm: number): { ft: number; in: number } {
  const totalIn = Math.round(cmToIn(cm));
  return { ft: Math.floor(totalIn / 12), in: totalIn % 12 };
}
export function ftInToCm(ft: number, inch: number): number {
  return inToCm(ft * 12 + inch);
}

export function displayWeight(kg: number, system: UnitSystem): { value: number; unit: 'kg' | 'lb' } {
  return system === 'IMPERIAL'
    ? { value: Math.round(kgToLb(kg) * 10) / 10, unit: 'lb' }
    : { value: Math.round(kg * 10) / 10, unit: 'kg' };
}

/** Convierte un valor ingresado por el usuario a kg. */
export function inputWeightToKg(value: number, system: UnitSystem): number {
  return system === 'IMPERIAL' ? lbToKg(value) : value;
}

export function weightUnitLabel(system: UnitSystem): 'kg' | 'lb' {
  return system === 'IMPERIAL' ? 'lb' : 'kg';
}
