import 'server-only';
import { createClient, type User } from '@supabase/supabase-js';
import { prisma } from '@/server/db';
import { bearerToken, isInvalidSession } from './http';

export type MobileAuth =
  | { status: 'ok'; userId: string; timezone: string; user: User }
  /** Sin sesión válida: la app pide iniciar sesión de nuevo (sin borrar lo pendiente). */
  | { status: 'unauthorized' }
  /** No se pudo comprobar: la app reintenta más tarde. */
  | { status: 'unavailable' };

/**
 * Quién es el que llama desde la app. La app no usa cookies: manda la sesión en `Authorization: Bearer`, y se valida
 * contra Supabase en cada pedido.
 */
export async function authenticateMobile(request: Request): Promise<MobileAuth> {
  const token = bearerToken(request.headers.get('authorization'));
  if (!token) return { status: 'unauthorized' };

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const res = await Promise.race([
    supabase.auth.getUser(token).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 8_000)),
  ]);
  if (!res) return { status: 'unavailable' };
  if (res.error) return { status: isInvalidSession(res.error.status) ? 'unauthorized' : 'unavailable' };
  const user = res.data.user;
  if (!user) return { status: 'unauthorized' };

  // Igual que en la web: si todavía no existen las filas de la cuenta, se crean.
  const existing = await prisma.profile.findUnique({ where: { id: user.id }, select: { timezone: true } });
  if (existing) return { status: 'ok', userId: user.id, timezone: existing.timezone, user };
  const created = await prisma.profile.upsert({
    where: { id: user.id },
    update: {},
    create: {
      id: user.id,
      email: user.email ?? `${user.id}@sin-email.local`,
      name: (user.user_metadata?.full_name as string | undefined) ?? null,
    },
    select: { timezone: true },
  });
  await prisma.entitlement.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
  return { status: 'ok', userId: user.id, timezone: created.timezone, user };
}
