/**
 * Lectura de datos de Open Food Facts (OFF). Sin dependencias de servidor, para poder
 * testearlo. OFF es colaborativo: muchos productos (sobre todo de Latinoamérica) vienen
 * incompletos, así que se reconstruye lo que se pueda con lo que haya.
 */

export interface OffNutriments {
  [key: string]: unknown;
}

export interface Macros100 {
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
}

const clamp = (n: number, max: number) => Math.min(Math.max(n, 0), max);
const round1 = (n: number) => Math.round(n * 10) / 10;

export function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number.parseFloat(v.replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Códigos a probar para un mismo producto. OFF guarda los UPC-A (12 dígitos) como EAN-13 con un
 * cero adelante, y los GTIN-14 (cajas) suelen estar cargados como el EAN-13 que contienen.
 */
export function candidateCodes(code: string): string[] {
  const c = code.trim();
  const out = [c];
  if (c.length === 12) out.push(`0${c}`);
  if (c.length === 13 && c.startsWith('0')) out.push(c.slice(1));
  if (c.length === 14) {
    out.push(c.slice(1));
    if (c.startsWith('0')) out.push(c.replace(/^0+/, ''));
  }
  return [...new Set(out)].filter((x) => /^\d{8,14}$/.test(x));
}

/** Valor por 100 g: directo, o a partir del valor por porción si se conoce el tamaño de porción. */
function per100(n: OffNutriments, key: string, servingQty: number | null): number | null {
  const direct = toNumber(n[`${key}_100g`]);
  if (direct !== null) return direct;
  const perServing = toNumber(n[`${key}_serving`]);
  if (perServing !== null && servingQty && servingQty > 0) return (perServing / servingQty) * 100;
  return null;
}

/**
 * Macros por 100 g. Si falta la energía pero hay macros, se calcula (4 · P + 4 · C + 9 · G).
 * Un producto con 0 kcal (gaseosas sin azúcar, agua saborizada) es válido: `null` sólo si no
 * hay ningún dato nutricional usable.
 */
export function parseOffMacros(n: OffNutriments, servingQty: number | null = null): Macros100 | null {
  const protein = per100(n, 'proteins', servingQty);
  const carbs = per100(n, 'carbohydrates', servingQty);
  const fat = per100(n, 'fat', servingQty);

  const kcalDirect = per100(n, 'energy-kcal', servingQty);
  let kj = toNumber(n['energy-kj_100g']) ?? toNumber(n.energy_100g);
  if (kj === null) {
    const kjServing = toNumber(n['energy-kj_serving']) ?? toNumber(n.energy_serving);
    if (kjServing !== null && servingQty && servingQty > 0) kj = (kjServing / servingQty) * 100;
  }

  let kcal: number | null = kcalDirect ?? (kj !== null ? kj / 4.184 : null);
  const hasMacro = protein !== null || carbs !== null || fat !== null;
  if (kcal === null && hasMacro) {
    kcal = (protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9;
  }
  if (kcal === null) return null;
  // Energía 0 declarada sin ningún otro dato: no hay forma de saber si es real.
  if (kcal <= 0 && !hasMacro && kcalDirect === null && kj === null) return null;

  return {
    kcalPer100: Math.round(clamp(kcal, 1000)),
    proteinPer100: round1(clamp(protein ?? 0, 1000)),
    carbsPer100: round1(clamp(carbs ?? 0, 1000)),
    fatPer100: round1(clamp(fat ?? 0, 1000)),
  };
}
