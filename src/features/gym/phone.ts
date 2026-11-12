/**
 * El gimnasio identifica a sus clientes por el número de teléfono (WhatsApp), más que por el mail. Funciones puras para
 * limpiar y comparar números argentinos escritos de mil maneras ("11 5555-1234", "+54 9 11 5555 1234", "011 15 5555 1234").
 */

/** Deja el número como lo escribió la persona, sin letras ni símbolos raros. */
export function cleanPhone(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/[^\d+\s()-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30) : '';
}

/** Solo los dígitos. */
export const phoneDigits = (raw: unknown): string => cleanPhone(raw).replace(/\D/g, '');

/** ¿Parece un teléfono? Entre 8 y 15 dígitos. */
export function isValidPhone(raw: unknown): boolean {
  const n = phoneDigits(raw).length;
  return n >= 8 && n <= 15;
}

/**
 * Una clave para comparar dos números aunque estén escritos distinto: los últimos 10 dígitos (código de área + número),
 * sin el 0, el 15 ni el +54 9. Dos números del mismo teléfono dan la misma clave. null si no alcanza.
 */
export function phoneKey(raw: unknown): string | null {
  let d = phoneDigits(raw);
  if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('9') && d.length > 10) d = d.slice(1);
  if (d.startsWith('0')) d = d.slice(1);
  // "011 15 5555 1234": el 15 de los celulares viejos va después del código de área
  const m = /^(\d{2,4})15(\d{6,8})$/.exec(d);
  if (m && (m[1]!.length + m[2]!.length === 10)) d = m[1]! + m[2]!;
  if (d.length < 8) return null;
  return d.slice(-10);
}
