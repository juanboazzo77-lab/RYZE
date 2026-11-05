'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase';
import { isAdmin } from '@/server/admin';

export interface LoginResult {
  /** Siempre el mismo mensaje, sea o no un mail autorizado: no se revela quién es administrador. */
  sent?: boolean;
  error?: string;
}

const emailSchema = z.string().trim().toLowerCase().email().max(200);

/**
 * Pide el enlace de ingreso. Sólo se manda si el mail está en ADMIN_EMAILS y ya existe como cuenta
 * (shouldCreateUser: false): nadie más recibe nada ni puede crear una cuenta desde acá.
 */
export async function requestLoginLink(raw: { email: string }): Promise<LoginResult> {
  const parsed = emailSchema.safeParse(raw.email);
  if (!parsed.success) return { error: 'Escribí un mail válido.' };
  const email = parsed.data;

  if (isAdmin(email)) {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? 'https';
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${proto}://${host}/auth/callback` },
    });
    if (error) {
      console.error('[admin-login] no se pudo mandar el enlace:', error.message);
      return { error: 'No se pudo enviar el enlace. Esperá un minuto y probá de nuevo.' };
    }
  }
  return { sent: true };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
