import 'server-only';
import { randomUUID } from 'node:crypto';
import { prisma } from './db';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase-admin';
import { MAX_PHOTO_BYTES, sniffPhoto, type NoteKind, type NoteStatus } from './admin-notes-shared';

/** Depósito PRIVADO: las capturas pueden mostrar datos de clientes o de gimnasios. */
const BUCKET = 'admin-notes';
const SIGNED_SECONDS = 60 * 60;

export interface NoteView {
  id: string;
  kind: NoteKind;
  text: string;
  status: NoteStatus;
  reply: string | null;
  createdAt: string;
  /** Enlace temporal a la captura (vence en una hora). */
  photoUrl: string | null;
}

async function ensureBucket() {
  const admin = createSupabaseAdminClient();
  const bucket = await admin.storage.getBucket(BUCKET);
  if (bucket.error) {
    await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_PHOTO_BYTES, allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'] });
  }
  return admin;
}

/** Sube la captura y devuelve su ruta, o null si no se pudo (la nota se guarda igual). */
async function uploadPhoto(file: File): Promise<string | null> {
  if (!supabaseAdminConfigured() || file.size === 0 || file.size > MAX_PHOTO_BYTES) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffPhoto(bytes);
  if (!kind) return null;
  const admin = await ensureBucket();
  const path = `${randomUUID()}.${kind.ext}`;
  const up = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: kind.type, upsert: false });
  if (up.error) {
    console.error('[buzon] no se pudo subir la captura:', up.error.message);
    return null;
  }
  return path;
}

export async function createNote(args: { kind: NoteKind; text: string; createdBy: string; photo: File | null }): Promise<{ photoFailed: boolean }> {
  const photoPath = args.photo ? await uploadPhoto(args.photo) : null;
  await prisma.adminNote.create({ data: { kind: args.kind, text: args.text, createdBy: args.createdBy, photoPath } });
  return { photoFailed: Boolean(args.photo) && !photoPath };
}

export async function listNotes(done: boolean): Promise<NoteView[]> {
  const rows = await prisma.adminNote.findMany({
    where: done ? { status: 'DONE' } : { status: { in: ['PENDING', 'DOING'] } },
    orderBy: done ? { updatedAt: 'desc' } : { createdAt: 'desc' },
    take: 100,
  });
  const paths = rows.flatMap((r) => (r.photoPath ? [r.photoPath] : []));
  const urls = new Map<string, string>();
  if (paths.length > 0 && supabaseAdminConfigured()) {
    const signed = await createSupabaseAdminClient().storage.from(BUCKET).createSignedUrls(paths, SIGNED_SECONDS);
    for (const s of signed.data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind === 'BUG' ? 'BUG' : 'IDEA',
    text: r.text,
    status: r.status === 'DONE' ? 'DONE' : r.status === 'DOING' ? 'DOING' : 'PENDING',
    reply: r.reply,
    createdAt: r.createdAt.toISOString(),
    photoUrl: r.photoPath ? (urls.get(r.photoPath) ?? null) : null,
  }));
}

export async function setNoteStatus(id: string, status: NoteStatus): Promise<boolean> {
  const res = await prisma.adminNote.updateMany({ where: { id }, data: { status } });
  return res.count > 0;
}

export async function deleteNote(id: string): Promise<boolean> {
  const note = await prisma.adminNote.findUnique({ where: { id }, select: { photoPath: true } });
  if (!note) return false;
  await prisma.adminNote.deleteMany({ where: { id } });
  if (note.photoPath && supabaseAdminConfigured()) {
    await createSupabaseAdminClient().storage.from(BUCKET).remove([note.photoPath]).catch(() => undefined);
  }
  return true;
}
