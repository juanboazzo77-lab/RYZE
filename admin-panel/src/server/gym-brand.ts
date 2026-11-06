import 'server-only';
import { prisma } from './db';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase-admin';
import { MAX_LOGO_BYTES, normalizeHexColor, safeLogoUrl, sniffImage } from '@/features/gym/brand';

/**
 * Marca propia del gimnasio: su color y su logo, que se muestran dentro de la app a sus socios. Cada función
 * comprueba que la cuenta sea la dueña de ese gimnasio. El logo se guarda en un depósito público de Supabase.
 */

const BUCKET = 'gym-logos';

export interface Brand {
  color: string | null;
  logoUrl: string | null;
}

export async function getBrand(ownerUserId: string, gymId: string): Promise<Brand | null> {
  const g = await prisma.gym.findFirst({ where: { id: gymId, ownerUserId }, select: { brandColor: true, logoUrl: true } });
  return g ? { color: g.brandColor, logoUrl: safeLogoUrl(g.logoUrl) } : null;
}

/** Guarda el color (o lo saca con null). */
export async function saveBrandColor(ownerUserId: string, gymId: string, raw: string | null): Promise<'ok' | 'INVALID' | 'NOT_OWNER'> {
  const color = raw === null || raw === '' ? null : normalizeHexColor(raw);
  if (raw && !color) return 'INVALID';
  const res = await prisma.gym.updateMany({ where: { id: gymId, ownerUserId }, data: { brandColor: color } });
  return res.count > 0 ? 'ok' : 'NOT_OWNER';
}

/** El archivo dentro del depósito, a partir de la dirección pública guardada. */
function objectPathOf(url: string | null): string | null {
  if (!url) return null;
  const i = url.indexOf(`/${BUCKET}/`);
  return i < 0 ? null : decodeURIComponent(url.slice(i + BUCKET.length + 2).split('?')[0]!);
}

export type LogoError = 'NOT_CONFIGURED' | 'NOT_OWNER' | 'NO_FILE' | 'TOO_BIG' | 'BAD_TYPE' | 'UPLOAD_FAILED';

/** Sube el logo: solo png, jpg o webp de hasta 400 KB, y se reconoce por el contenido, no por lo que diga el navegador. */
export async function uploadLogo(ownerUserId: string, gymId: string, file: File | null): Promise<{ ok: true; logoUrl: string } | { error: LogoError }> {
  if (!supabaseAdminConfigured()) return { error: 'NOT_CONFIGURED' };
  const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerUserId }, select: { logoUrl: true } });
  if (!gym) return { error: 'NOT_OWNER' };
  if (!file || file.size === 0) return { error: 'NO_FILE' };
  if (file.size > MAX_LOGO_BYTES) return { error: 'TOO_BIG' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return { error: 'BAD_TYPE' };

  const admin = createSupabaseAdminClient();
  // Si el depósito todavía no existe (la migración no pudo crearlo), se crea acá.
  const bucket = await admin.storage.getBucket(BUCKET);
  if (bucket.error) {
    await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_LOGO_BYTES, allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'] });
  }
  const path = `${gymId}/logo-${Date.now()}.${kind.ext}`;
  const up = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: kind.type, upsert: false, cacheControl: '31536000' });
  if (up.error) {
    console.error('[logo] no se pudo subir:', up.error.message);
    return { error: 'UPLOAD_FAILED' };
  }
  const logoUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  await prisma.gym.update({ where: { id: gymId }, data: { logoUrl } });
  // El logo anterior ya no se usa: se borra (si falla, no pasa nada).
  const old = objectPathOf(gym.logoUrl);
  if (old) await admin.storage.from(BUCKET).remove([old]).catch(() => undefined);
  return { ok: true, logoUrl };
}

export async function removeLogo(ownerUserId: string, gymId: string): Promise<boolean> {
  const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerUserId }, select: { logoUrl: true } });
  if (!gym) return false;
  await prisma.gym.update({ where: { id: gymId }, data: { logoUrl: null } });
  const old = objectPathOf(gym.logoUrl);
  if (old && supabaseAdminConfigured()) await createSupabaseAdminClient().storage.from(BUCKET).remove([old]).catch(() => undefined);
  return true;
}
