import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/server/supabase/server';

/**
 * Enlace de un solo uso que llega por mail (por ejemplo, la invitación a un dueño de gimnasio para elegir su
 * contraseña). A diferencia del callback normal, no depende de que el pedido haya salido de este mismo
 * navegador: valida el `token_hash` y deja la sesión puesta antes de seguir a `next`.
 */
const ALLOWED: EmailOtpType[] = ['recovery', 'invite', 'email', 'magiclink'];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const rawNext = searchParams.get('next') ?? '/dashboard';
  // Sólo rutas propias: nunca a otro sitio.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard';

  if (tokenHash && type && ALLOWED.includes(type)) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
