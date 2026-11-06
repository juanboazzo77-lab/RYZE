/**
 * Datos de cobro de un gimnasio para su QR. Función pura: valida lo que escribe el dueño antes de guardarlo y
 * antes de convertirlo en un QR que sus clientes van a escanear.
 */

/** Un link de pago: solo https, sin espacios, hasta 500 caracteres. Devuelve null si no sirve. */
export function normalizePaymentLink(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim();
  if (!v || v.length > 500) return null;
  if (!/^https:\/\/[^\s"'<>]+$/i.test(v)) return null;
  try {
    const u = new URL(v);
    return u.hostname.includes('.') ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Alias (6 a 40: letras, números, punto, guion o guion bajo) o CBU/CVU (22 números). En minúsculas el alias; null si no sirve. */
export function normalizePaymentAlias(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim().replace(/\s+/g, '');
  if (/^\d{22}$/.test(v)) return v;
  if (/^[A-Za-z0-9._-]{6,40}$/.test(v) && /[A-Za-z]/.test(v)) return v.toLowerCase();
  return null;
}

export const isCbu = (v: string): boolean => /^\d{22}$/.test(v);
