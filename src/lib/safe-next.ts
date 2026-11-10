/**
 * Adónde mandar a la persona después de entrar o registrarse (`next`). Solo se acepta una ruta de este mismo
 * sitio: empieza con una sola barra y no es "//otro-sitio.com" ni "/\\otro-sitio.com" (que el navegador toma
 * como otro dominio). Cualquier otra cosa vuelve a `fallback`.
 */
export function safeNext(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw || raw.length > 300) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  if (/[\r\n\t]/.test(raw)) return fallback;
  return raw;
}
