/**
 * Quien activa su plan desde la página de un gimnasio tiene que poner su nombre y apellido, así el dueño sabe quién es
 * en su lista de clientes y puede asignarle el plan que corresponde. Función pura.
 */

/** Limpia un nombre: espacios de más afuera, y cada palabra en su forma normal. */
export function cleanFullName(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
}

/** ¿Es un nombre completo? Al menos dos palabras de 2 letras o más, sin mails ni números. */
export function isFullName(raw: unknown): boolean {
  const name = cleanFullName(raw);
  if (!name || /[@\d_]/.test(name) || name.includes('/') || name.includes('\\')) return false;
  const words = name.split(' ').filter((w) => w.replace(/[.'’-]/g, '').length >= 2);
  return words.length >= 2;
}
