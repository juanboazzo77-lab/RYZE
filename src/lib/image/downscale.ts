/**
 * Reduce una imagen en el navegador antes de mandarla al servidor. Se usa para
 * las fotos de físico de la revisión semanal: se achican a un lado máximo y se
 * recomprimen a JPEG para que el payload sea chico. Las fotos NO se guardan en
 * ningún lado; sólo viajan a la IA para el análisis de esa revisión.
 */

const MAX_SIDE = 1280;
const JPEG_QUALITY = 0.82;

export async function downscaleImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('no se pudo leer la imagen');

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas no disponible');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  if (!dataUrl.startsWith('data:image/jpeg;base64,')) throw new Error('no se pudo comprimir');
  return dataUrl;
}
