import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase';
import { getOwnedGym } from '@/server/owner';
import { isAdmin } from '@/server/admin';

export interface SessionUser {
  userId: string;
  email: string;
}

/** La persona logueada (cualquier cuenta de Forza AI), o null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  return u?.email ? { userId: u.id, email: u.email } : null;
}

export interface OwnerCtx extends SessionUser {
  gym: { id: string; name: string } | null;
  isAdmin: boolean;
}

/** Quién es y de qué gimnasio es dueña (si lo es). Sin sesión va al login. */
export async function getOwnerCtx(): Promise<OwnerCtx> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const gym = await getOwnedGym(user.userId);
  return { ...user, gym, isAdmin: isAdmin(user.email) };
}

/** Para las pantallas del panel del gimnasio: tiene que ser dueña de un gimnasio. */
export async function requireOwnerPage(): Promise<{ userId: string; email: string; gym: { id: string; name: string } }> {
  const ctx = await getOwnerCtx();
  if (!ctx.gym) notFound();
  return { userId: ctx.userId, email: ctx.email, gym: ctx.gym };
}

/** Para las acciones del servidor: se comprueba en CADA acción y el gimnasio sale de la base, nunca del navegador. */
export async function requireOwner(): Promise<{ userId: string; email: string; gym: { id: string; name: string } }> {
  const user = await getSessionUser();
  if (!user) throw new Error('NOT_SIGNED_IN');
  const gym = await getOwnedGym(user.userId);
  if (!gym) throw new Error('NOT_OWNER');
  return { ...user, gym };
}
