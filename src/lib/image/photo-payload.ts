import { z } from 'zod';

/**
 * Cómo viajan las fotos del cliente a una acción del servidor.
 *
 * NO como lista de textos: al decodificar los argumentos de una acción, React cuenta los
 * caracteres de los textos que van dentro de una lista y corta en 1.000.000 ("Maximum array
 * nesting exceeded"). Una foto en base64 ya pesa cientos de miles de caracteres, así que con
 * tres o cuatro la acción fallaba antes de ejecutarse. Dentro de un objeto no se cuenta.
 */
const SLOTS = ['p0', 'p1', 'p2', 'p3'] as const;
export const MAX_PHOTOS = SLOTS.length;

export type PhotoPayload = Partial<Record<(typeof SLOTS)[number], string>>;

/** Data URL de imagen ya reducida en el cliente. Tope ~4 MB por las dudas. */
export const dataUrlPhoto = z
  .string()
  .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)
  .max(4_000_000);

export const photoPayloadSchema = z.object({
  p0: dataUrlPhoto.optional(),
  p1: dataUrlPhoto.optional(),
  p2: dataUrlPhoto.optional(),
  p3: dataUrlPhoto.optional(),
});

/** Lista de fotos → objeto para mandar a una acción (se descartan las que sobran). */
export function packPhotos(list: string[]): PhotoPayload {
  const out: PhotoPayload = {};
  list.slice(0, MAX_PHOTOS).forEach((p, i) => {
    out[SLOTS[i]!] = p;
  });
  return out;
}

/** Objeto recibido en una acción → lista de fotos, en orden. */
export function unpackPhotos(payload: PhotoPayload | null | undefined): string[] {
  if (!payload) return [];
  return SLOTS.map((k) => payload[k]).filter((p): p is string => typeof p === 'string');
}
