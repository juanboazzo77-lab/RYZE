'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { createNote, deleteNote, setNoteStatus } from '@/server/admin-notes';
import { MAX_NOTE_LENGTH } from '@/server/admin-notes-shared';

const noteSchema = z.object({ kind: z.enum(['BUG', 'IDEA']), text: z.string().trim().min(3).max(MAX_NOTE_LENGTH) });
const statusSchema = z.object({ id: z.string().uuid(), status: z.enum(['PENDING', 'DOING', 'DONE']) });
const idSchema = z.object({ id: z.string().uuid() });

/** Anota un error o una mejora. Solo el administrador (se comprueba en cada acción). */
export async function saveNote(form: FormData): Promise<{ ok: true; photoFailed: boolean } | { error: 'INVALID' }> {
  const email = await requireAdmin();
  const parsed = noteSchema.safeParse({ kind: form.get('kind'), text: form.get('text') });
  if (!parsed.success) return { error: 'INVALID' };
  const file = form.get('photo');
  const res = await createNote({ ...parsed.data, createdBy: email, photo: file instanceof File && file.size > 0 ? file : null });
  revalidatePath('/buzon');
  return { ok: true, photoFailed: res.photoFailed };
}

export async function changeNoteStatus(raw: z.input<typeof statusSchema>): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const ok = await setNoteStatus(parsed.data.id, parsed.data.status);
  revalidatePath('/buzon');
  return { ok };
}

export async function removeNote(raw: z.input<typeof idSchema>): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const ok = await deleteNote(parsed.data.id);
  revalidatePath('/buzon');
  return { ok };
}
