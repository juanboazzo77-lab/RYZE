'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireOwner } from '@/lib/owner';
import { removeLogo, saveBrandColor, uploadLogo, type LogoError } from '@/server/gym-brand';
import { deleteRoutine, saveRoutine, setRoutineActive } from '@/server/gym-routines';

interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

const refresh = () => {
  revalidatePath('/gym/marca');
  revalidatePath('/gym/rutinas');
};

/** Color de la marca (o vacío para volver al de Forza AI). */
export async function saveBrandColorAction(raw: { color: string }): Promise<Result> {
  const color = z.string().max(20).safeParse(raw.color);
  if (!color.success) return { error: 'INVALID' };
  const { userId, gym } = await requireOwner({ ownerOnly: true });
  const res = await saveBrandColor(userId, gym.id, color.data.trim() === '' ? null : color.data);
  refresh();
  return res === 'ok' ? { ok: true } : { error: res };
}

/** Sube el logo desde el formulario. */
export async function uploadLogoAction(formData: FormData): Promise<Result<{ logoUrl: string }> & { error?: LogoError | 'INVALID' }> {
  const file = formData.get('logo');
  if (!(file instanceof File)) return { error: 'NO_FILE' };
  const { userId, gym } = await requireOwner({ ownerOnly: true });
  const res = await uploadLogo(userId, gym.id, file);
  refresh();
  return 'ok' in res ? { ok: true, data: { logoUrl: res.logoUrl } } : { error: res.error };
}

export async function removeLogoAction(): Promise<Result> {
  const { userId, gym } = await requireOwner({ ownerOnly: true });
  const ok = await removeLogo(userId, gym.id);
  refresh();
  return ok ? { ok: true } : { error: 'NOT_OWNER' };
}

/* --- Rutinas oficiales --- */

const exerciseSchema = z.object({ name: z.string().max(200), sets: z.string().max(40).optional(), reps: z.string().max(60).optional(), note: z.string().max(400).optional() });
const routineSchema = z.object({
  id: z.string().uuid().nullable(),
  title: z.string().max(200),
  description: z.string().max(1000).optional(),
  level: z.string().max(20).nullable().optional(),
  days: z.array(z.object({ name: z.string().max(200).optional(), exercises: z.array(exerciseSchema).max(40) })).max(14),
});

export async function saveRoutineAction(raw: z.input<typeof routineSchema>): Promise<Result<{ id: string }>> {
  const parsed = routineSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, gym } = await requireOwner({ ownerOnly: true });
  const { id, ...rest } = parsed.data;
  const res = await saveRoutine(userId, gym.id, id, rest);
  refresh();
  return 'ok' in res ? { ok: true, data: { id: res.id } } : { error: res.error };
}

export async function setRoutineActiveAction(raw: { id: string; active: boolean }): Promise<Result> {
  const id = z.string().uuid().safeParse(raw.id);
  if (!id.success) return { error: 'INVALID' };
  const { userId } = await requireOwner({ ownerOnly: true });
  const ok = await setRoutineActive(userId, id.data, raw.active === true);
  refresh();
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}

export async function deleteRoutineAction(raw: { id: string }): Promise<Result> {
  const id = z.string().uuid().safeParse(raw.id);
  if (!id.success) return { error: 'INVALID' };
  const { userId } = await requireOwner({ ownerOnly: true });
  const ok = await deleteRoutine(userId, id.data);
  refresh();
  return ok ? { ok: true } : { error: 'NOT_FOUND' };
}
