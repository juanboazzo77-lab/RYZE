import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/server/supabase/server';

/**
 * Callback de Supabase Auth: confirmación de email, recuperación de contraseña
 * y (a futuro) OAuth Google/Apple. Intercambia el `code` por una sesión y
 * redirige a `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/dashboard';
  const next = rawNext.startsWith('/') ? rawNext : '/dashboard';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
