import 'server-only';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase';
import { getOwnedGym } from '@/server/owner';
import { isAdmin } from '@/server/admin';
import { pathAllowed, type PanelRole } from '@/features/gym/staff';

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
  /** OWNER, o el rol que el dueño le dio a esta persona del equipo. */
  role: PanelRole;
  /** La cuenta del dueño del gimnasio: las funciones del servidor trabajan sobre sus datos. */
  ownerUserId: string | null;
}

/** Quién es y de qué gimnasio es dueña (si lo es). Sin sesión va al login. */
export async function getOwnerCtx(): Promise<OwnerCtx> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const gym = await getOwnedGym(user.userId);
  return { ...user, gym: gym ? { id: gym.id, name: gym.name } : null, isAdmin: isAdmin(user.email), role: gym?.role ?? 'OWNER', ownerUserId: gym?.ownerUserId ?? null };
}

/** Para las pantallas del panel del gimnasio: tiene que ser dueña de un gimnasio. */
export async function requireOwnerPage(): Promise<{ userId: string; email: string; gym: { id: string; name: string }; role: PanelRole }> {
  const ctx = await getOwnerCtx();
  if (!ctx.gym || !ctx.ownerUserId) notFound();
  // El equipo solo entra a lo que su rol permite; lo demás lo manda de vuelta al Resumen.
  const path = (await headers()).get('x-pathname') ?? '';
  if (path && !pathAllowed(ctx.role, path)) redirect('/gym');
  return { userId: ctx.ownerUserId, email: ctx.email, gym: ctx.gym, role: ctx.role };
}

/** Para las acciones del servidor: se comprueba en CADA acción y el gimnasio sale de la base, nunca del navegador. */
export async function requireOwner(opts: { ownerOnly?: boolean } = {}): Promise<{ userId: string; email: string; gym: { id: string; name: string }; role: PanelRole }> {
  const user = await getSessionUser();
  if (!user) throw new Error('NOT_SIGNED_IN');
  const gym = await getOwnedGym(user.userId);
  if (!gym) throw new Error('NOT_OWNER');
  // Acciones solo del dueño (equipo, marca, equipamiento, términos, recordatorios): el equipo nunca, sin importar desde dónde.
  if (opts.ownerOnly && gym.role !== 'OWNER') throw new Error('FORBIDDEN');
  // La dirección de la pantalla desde la que se llama a la acción: el equipo solo puede lo que su rol permite.
  const path = (await headers()).get('x-pathname') ?? '';
  if (gym.role !== 'OWNER' && !pathAllowed(gym.role, path || '/nada')) throw new Error('FORBIDDEN');
  return { userId: gym.ownerUserId, email: user.email, gym: { id: gym.id, name: gym.name }, role: gym.role };
}
