import 'server-only';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase';
import { isAdmin } from '@/server/admin';

/** Mail del administrador logueado, o null si no hay sesión o no es un mail autorizado. */
export async function getAdminEmail(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? null;
  return email && isAdmin(email) ? email : null;
}

/** Para las pantallas: sin sesión de administrador, al login. */
export async function requireAdminPage(): Promise<string> {
  const email = await getAdminEmail();
  if (!email) redirect('/login');
  return email;
}

/** Para las acciones del servidor: se comprueba en CADA acción, no sólo al mostrar la pantalla. */
export async function requireAdmin(): Promise<string> {
  const email = await getAdminEmail();
  if (!email) throw new Error('NOT_ADMIN');
  return email;
}
