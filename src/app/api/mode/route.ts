import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Un dueño de gimnasio tiene dos caras con la misma cuenta: el panel del gimnasio (/gym) y la app de socio
 * (/dashboard). Esto recuerda cuál quiere ver al entrar (cookie `fz_mode`) y lo lleva ahí.
 */
export function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get('to') === 'member' ? 'member' : 'gym';
  const res = NextResponse.redirect(new URL(to === 'member' ? '/dashboard' : '/gym', request.nextUrl.origin));
  res.cookies.set('fz_mode', to, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: true, secure: true });
  return res;
}
