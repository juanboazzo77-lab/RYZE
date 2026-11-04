import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { createSupabaseAdminClient } from '../supabase/server';

/**
 * Fotos de la revisión semanal de un cliente conectado con un entrenador. Se guardan en un bucket
 * PRIVADO de Supabase Storage (sin acceso público) y el entrenador las ve con enlaces firmados que
 * vencen. Se usa la clave de servicio: el acceso lo controla el servidor, comprobando el vínculo.
 */

const BUCKET = 'checkin-photos';
/** Cuánto duran los enlaces para ver una foto. */
const SIGNED_URL_SECONDS = 60 * 60;

function decode(dataUrl: string): { buffer: Buffer; contentType: string; ext: string } | null {
  const m = /^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  return { buffer: Buffer.from(m[3]!, 'base64'), contentType: m[1]!, ext: m[2] === 'jpeg' ? 'jpg' : m[2]! };
}

async function ensureBucket(): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.createBucket(BUCKET, { public: false });
  // Si ya existe no es un problema.
  if (error && !/already exists|duplicate/i.test(error.message)) {
    console.error('[checkin-photos] no se pudo crear el bucket', error.message);
  }
}

/** Sube las fotos y devuelve las rutas guardadas. Las que fallan se omiten. */
export async function saveCheckinPhotos(clientId: string, checkinId: string, dataUrls: string[]): Promise<string[]> {
  const admin = createSupabaseAdminClient();
  const paths: string[] = [];
  let bucketChecked = false;
  for (const [i, url] of dataUrls.entries()) {
    const file = decode(url);
    if (!file) continue;
    const path = `${clientId}/${checkinId}/${Date.now()}-${i}.${file.ext}`;
    let { error } = await admin.storage.from(BUCKET).upload(path, file.buffer, { contentType: file.contentType, upsert: false });
    if (error && !bucketChecked && /bucket not found/i.test(error.message)) {
      bucketChecked = true;
      await ensureBucket();
      ({ error } = await admin.storage.from(BUCKET).upload(path, file.buffer, { contentType: file.contentType, upsert: false }));
    }
    if (error) {
      console.error('[checkin-photos] no se pudo subir una foto', error.message);
      continue;
    }
    paths.push(path);
  }
  return paths;
}

/** Enlaces para ver las fotos (vencen en una hora), en el mismo orden; las que fallan se omiten. */
export async function signedPhotoUrls(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data, error } = await createSupabaseAdminClient().storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error || !data) return [];
  return data.map((d) => d.signedUrl).filter((u): u is string => !!u);
}

export async function deleteCheckinPhotos(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await createSupabaseAdminClient().storage.from(BUCKET).remove(paths);
  if (error) console.error('[checkin-photos] no se pudieron borrar fotos', error.message);
}

/** Rutas guardadas en una revisión (la columna es JSON: se valida que sea una lista de textos). */
export function pathsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((p): p is string => typeof p === 'string') : [];
}

/** Borra todas las fotos de revisión de un cliente (cuando deja de compartir con su entrenador). */
export async function purgeClientCheckinPhotos(clientId: string): Promise<void> {
  const rows = await prisma.weeklyCheckin.findMany({
    where: { userId: clientId, photoPaths: { not: Prisma.DbNull } },
    select: { id: true, photoPaths: true },
  });
  const all = rows.flatMap((r) => pathsOf(r.photoPaths));
  if (all.length > 0) await deleteCheckinPhotos(all);
  if (rows.length > 0) {
    await prisma.weeklyCheckin.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { photoPaths: Prisma.DbNull } });
  }
}
