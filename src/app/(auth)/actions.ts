'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/server/supabase/server';
import { getDictionary } from '@/i18n';
import { getLocale } from '@/i18n/server';

export interface AuthActionState {
  error?: string;
  message?: string;
}

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8);

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = getDictionary(await getLocale());
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/dashboard');

  if (!emailSchema.safeParse(email).success || !password) {
    return { error: t.auth.fillFields };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: t.auth.invalidCredentials };

  redirect(next.startsWith('/') ? next : '/dashboard');
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = getDictionary(await getLocale());
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const name = String(formData.get('name') ?? '').trim();

  if (!emailSchema.safeParse(email).success) return { error: t.auth.fillFields };
  if (!passwordSchema.safeParse(password).success) return { error: t.auth.passwordTooShort };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl()}/auth/callback?next=/onboarding`,
      data: name ? { full_name: name } : undefined,
    },
  });
  if (error) return { error: error.message };

  // Si el proyecto no exige confirmación de email, ya hay sesión.
  if (data.session) redirect('/onboarding');
  return { message: t.auth.checkEmail };
}

export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = getDictionary(await getLocale());
  const email = String(formData.get('email') ?? '').trim();
  if (!emailSchema.safeParse(email).success) return { error: t.auth.fillFields };

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl()}/auth/callback?next=/reset-password`,
  });
  // Respuesta neutra: no revelar si el email existe.
  return { message: t.auth.resetSent };
}

export async function updatePasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = getDictionary(await getLocale());
  const password = String(formData.get('password') ?? '');
  if (!passwordSchema.safeParse(password).success) return { error: t.auth.passwordTooShort };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t.auth.invalidCredentials };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  redirect('/login?reset=1');
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
