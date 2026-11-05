import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { isAdmin } from '@/server/admin';

export const dynamic = 'force-dynamic';

/** Regreso del enlace que llega por mail: canjea el código por la sesión y verifica que sea administrador. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const fail = () => NextResponse.redirect(new URL('/login?error=1', url.origin));
  if (!code) return fail();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail();

  const { data } = await supabase.auth.getUser();
  if (!isAdmin(data.user?.email)) {
    await supabase.auth.signOut();
    return fail();
  }
  return NextResponse.redirect(new URL('/', url.origin));
}
