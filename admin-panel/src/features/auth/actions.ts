'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase';
import { isAdmin } from '@/server/admin';
import { prisma } from '@/server/db';

export interface LoginResult {
  /** Siempre el mismo mensaje, sea o no un mail autorizado: no se revela quién es administrador ni dueño. */
  sent?: boolean;
  error?: string;
}

const emailSchema = z.string().trim().toLowerCase().email().max(200);

/** ¿Este mail es de un administrador o de un dueño de gimnasio? Solo ellos reciben enlace. */
async function canEnter(email: string): Promise<boolean> {
  if (isAdmin(email)) return true;
  const gym = await prisma.gym.findFirst({
    where: { status: { in: ['ACTIVE', 'SUSPENDED', 'PENDING'] }, owner: { email: { equals: email, mode: 'insensitive' } } },
    select: { id: true },
  });
  return gym !== null;
}

/**
 * Pide el enlace de ingreso. Solo se manda si el mail es de un administrador o de un dueño de gimnasio y ya
 * existe como cuenta (shouldCreateUser: false): nadie más recibe nada ni puede crear una cuenta desde acá.
 */
export async function requestLoginLink(raw: { email: string }): Promise<LoginResult> {
  const parsed = emailSchema.safeParse(raw.email);
  if (!parsed.success) return { error: 'Escribí un mail válido.' };
  const email = parsed.data;

  if (await canEnter(email)) {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? 'https';
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${proto}://${host}/auth/callback` },
    });
    if (error) {
      console.error('[login] no se pudo mandar el enlace:', error.message);
      return { error: 'No se pudo enviar el enlace. Esperá un minuto y probá de nuevo.' };
    }
  }
  return { sent: true };
}

/** Entrar con mail y contraseña (la que el dueño eligió con el enlace de su invitación). */
export async function signInWithPassword(raw: { email: string; password: string }): Promise<LoginResult & { to?: string }> {
  const parsed = emailSchema.safeParse(raw.email);
  const password = z.string().min(1).max(200).safeParse(raw.password);
  if (!parsed.success || !password.success) return { error: 'Revisá tu mail y tu contraseña.' };
  const email = parsed.data;
  // No se prueba la contraseña de una cuenta que no puede entrar acá.
  if (!(await canEnter(email))) return { error: 'Mail o contraseña incorrectos.' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: password.data });
  if (error) return { error: 'Mail o contraseña incorrectos.' };
  return { sent: true, to: isAdmin(email) ? '/' : '/gym' };
}

/** El dueño elige su contraseña (después de abrir el enlace de su invitación). */
export async function setPasswordAction(raw: { password: string }): Promise<{ ok?: boolean; error?: string; to?: string }> {
  const password = z.string().min(8, 'Usá al menos 8 caracteres.').max(200).safeParse(raw.password);
  if (!password.success) return { error: password.error.issues[0]?.message ?? 'Contraseña no válida.' };
  const supabase = await createSupabaseServerClient();
  const { data: sessionData } = await supabase.auth.getUser();
  if (!sessionData.user) return { error: 'El enlace venció. Pedí uno nuevo.' };
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: 'No se pudo guardar la contraseña. Probá de nuevo.' };
  return { ok: true, to: isAdmin(sessionData.user.email) ? '/' : '/gym' };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
