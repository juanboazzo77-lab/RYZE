import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Enlace de un solo uso que arma el administrador (invitación a un dueño de gimnasio): valida el token y lleva a
 * elegir la contraseña. Solo acepta tokens de recuperación y solo manda a /reset-password, nunca a una dirección de afuera.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const fail = () => NextResponse.redirect(new URL('/login?error=1', url.origin));
  if (!tokenHash || type !== 'recovery') return fail();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
  if (error) return fail();
  return NextResponse.redirect(new URL('/reset-password', url.origin));
}
