import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Rutas accesibles sin sesión. Las de `/api` hacen su propia autenticación. */
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/api',
  '/offline',
  '/privacy',
  '/terms',
];
/**
 * Rutas de autenticación: si ya hay sesión, se redirige al dashboard.
 * `/reset-password` queda fuera a propósito: se llega con una sesión de
 * recuperación activa y hay que poder cambiar la contraseña.
 */
const AUTH_PATHS = ['/login', '/register', '/forgot-password'];

/**
 * Refresca la sesión de Supabase en cada request y protege las rutas privadas.
 * Se llama desde src/middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Si Supabase Auth no responde a tiempo (red lenta/caída), no dejamos la
  // request colgada indefinidamente: se trata como "sin sesión" y se redirige
  // a login, que siempre puede renderizar.
  const user = await Promise.race([
    supabase.auth.getUser().then((r) => r.data.user),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 8_000)),
  ]);

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthRoute = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
