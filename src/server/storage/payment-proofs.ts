import 'server-only';
import { randomUUID } from 'node:crypto';
import { createSupabaseAdminClient } from '../supabase/server';

/**
 * Comprobantes de pago de las altas de socios. Se guardan en un depósito PRIVADO de Supabase Storage (sin
 * acceso público): los sube el dueño del gimnasio desde el servidor y sólo el administrador los ve, con enlaces
 * firmados que vencen.
 */

const BUCKET = 'gym-payment-proofs';
export const MAX_PROOF_BYTES = 4 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export type ProofError = 'NO_FILE' | 'TOO_BIG' | 'BAD_TYPE' | 'UPLOAD_FAILED';

/** ¿Es una ruta de comprobante de este gimnasio? (siempre `<gymId>/<uuid>.<ext>`). */
export function isProofPathOf(gymId: string, path: string): boolean {
  return new RegExp(`^${gymId}/[0-9a-f-]{36}\\.(jpg|png|webp|pdf)$`).test(path);
}

async function ensureBucket(): Promise<void> {
  const { error } = await createSupabaseAdminClient().storage.createBucket(BUCKET, { public: false });
  if (error && !/already exists|duplicate/i.test(error.message)) console.error('[payment-proofs] no se pudo crear el depósito', error.message);
}

/** Sube un comprobante y devuelve su ruta. Valida el tipo y el tamaño. */
export async function saveProof(gymId: string, file: File | null): Promise<{ path: string } | { error: ProofError }> {
  if (!file || file.size === 0) return { error: 'NO_FILE' };
  if (file.size > MAX_PROOF_BYTES) return { error: 'TOO_BIG' };
  const ext = ALLOWED[file.type];
  if (!ext) return { error: 'BAD_TYPE' };
  const path = `${gymId}/${randomUUID()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());
  const admin = createSupabaseAdminClient();
  let { error } = await admin.storage.from(BUCKET).upload(path, body, { contentType: file.type, upsert: false });
  if (error && /bucket not found/i.test(error.message)) {
    await ensureBucket();
    ({ error } = await admin.storage.from(BUCKET).upload(path, body, { contentType: file.type, upsert: false }));
  }
  if (error) {
    console.error('[payment-proofs] no se pudo subir', error.message);
    return { error: 'UPLOAD_FAILED' };
  }
  return { path };
}
