/**
 * Reduce una imagen en el navegador antes de mandarla al servidor. Se usa para
 * las fotos de físico de la revisión semanal: se achican a un lado máximo y se
 * recomprimen a JPEG para que el payload sea chico. Las fotos NO se guardan en
 * ningún lado; sólo viajan a la IA para el análisis de esa revisión.
 *
 * El decodificado es tolerante: en iPhone las fotos vienen en HEIC y rotadas por
 * EXIF, y `createImageBitmap` no siempre las acepta (o ignora la rotación).
 */

const MAX_SIDE = 1280;
const JPEG_QUALITY = 0.82;
const MAX_FILE_BYTES = 30 * 1024 * 1024;

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    // Con rotación EXIF; si el navegador no acepta la opción, sin ella.
    for (const opts of [{ imageOrientation: 'from-image' as const }, undefined]) {
      try {
        const bmp = opts ? await createImageBitmap(file, opts) : await createImageBitmap(file);
        if (bmp.width > 0 && bmp.height > 0) {
          return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
        }
        bmp.close();
      } catch {
        // probar la siguiente forma
      }
    }
  }

  // Plan B: <img> (el navegador respeta EXIF y suele poder leer HEIC).
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    if (img.naturalWidth === 0 || img.naturalHeight === 0) throw new Error('imagen vacía');
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

export async function downscaleImage(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error('imagen demasiado grande');

  const img = await decode(file).catch(() => null);
  if (!img) throw new Error('no se pudo leer la imagen');

  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas no disponible');
    // Fondo blanco: un PNG con transparencia saldría negro al pasar a JPEG.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img.source, 0, 0, w, h);

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    if (!dataUrl.startsWith('data:image/jpeg;base64,')) throw new Error('no se pudo comprimir');
    return dataUrl;
  } finally {
    img.release();
  }
}
