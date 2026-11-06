import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Rutas sin sesión: el login y el regreso de los enlaces que llegan por mail. */
// /api/cron lo llama Vercel con su propio secreto (CRON_SECRET), sin sesión.
// /solicitar es el formulario público para que un gimnasio nuevo pida autorización.
const PUBLIC_PATHS = ['/login', '/auth', '/api/cron', '/solicitar', '/terminos-gimnasios'];
/** Rutas para cualquier cuenta con sesión (cada pantalla vuelve a comprobar si es dueña de un gimnasio). */
const SIGNED_IN_PATHS = ['/gym', '/reset-password'];

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

const under = (pathname: string, paths: string[]) => paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Refresca la sesión y reparte el acceso: la gestión (todo menos /gym) es solo para los mails de ADMIN_EMAILS;
 * el panel del gimnasio (/gym) es para cualquier cuenta con sesión, y ahí cada pantalla comprueba que sea dueña
 * de un gimnasio. (Cada pantalla y cada acción vuelve a comprobarlo: esto es la primera barrera, no la única.)
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  let email: string | null = null;
  try {
    const { data } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null } }>((resolve) => setTimeout(() => resolve({ data: { user: null } }), 8000)),
    ]);
    email = data.user?.email?.toLowerCase() ?? null;
  } catch {
    email = null;
  }
  const signedIn = email !== null;
  const admin = email !== null && adminEmails().includes(email);
  const isPublic = under(pathname, PUBLIC_PATHS);
  const redirectTo = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = '';
    return NextResponse.redirect(url);
  };

  if (isPublic) {
    // Con sesión, el login no hace falta: cada uno va a lo suyo.
    if (signedIn && pathname === '/login') return redirectTo(admin ? '/' : '/gym');
    return response;
  }
  if (!signedIn) return redirectTo('/login');
  if (under(pathname, SIGNED_IN_PATHS)) return response;
  // Todo lo demás es gestión: solo el administrador.
  if (!admin) return redirectTo('/gym');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
