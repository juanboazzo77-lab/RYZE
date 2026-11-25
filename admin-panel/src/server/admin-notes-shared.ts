/** Lo del buzón que no necesita servidor (para usarlo también en el navegador y poder testearlo). */

export type NoteKind = 'BUG' | 'IDEA';
export type NoteStatus = 'PENDING' | 'DOING' | 'DONE';

export const MAX_NOTE_LENGTH = 4000;
/** Las acciones del servidor aceptan hasta 1 MB: la captura se achica en el navegador por debajo de esto. */
export const MAX_PHOTO_BYTES = 850 * 1024;

/** Reconoce la imagen por su contenido, no por el nombre ni por lo que diga el navegador. */
export function sniffPhoto(b: Uint8Array): { type: string; ext: string } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { type: 'image/png', ext: 'png' };
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b.length > 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { type: 'image/webp', ext: 'webp' };
  return null;
}
