import { createClient, isAuthRetryableFetchError } from '@supabase/supabase-js';
import { tokenFrom } from '@/lib/sync/session-token';
import { deviceStore } from './platform/device-store';

/** Quién tiene la sesión abierta en este teléfono. Se guarda aparte para poder abrir la app sin señal. */
export interface Account {
  userId: string;
  email: string;
}

const ACCOUNT_KEY = 'forza.account';

const supabase = createClient(__SUPABASE_URL__, __SUPABASE_ANON_KEY__, {
  auth: {
    // La sesión se guarda en los archivos de la app, igual que los datos.
    storage: {
      getItem: (key: string) => deviceStore.get(`forza.auth.${key}`),
      setItem: (key: string, value: string) => deviceStore.set(`forza.auth.${key}`, value),
      removeItem: (key: string) => deviceStore.remove(`forza.auth.${key}`),
    },
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/** La cuenta abierta, sin usar internet. */
export async function loadAccount(): Promise<Account | null> {
  const raw = await deviceStore.get(ACCOUNT_KEY);
  if (!raw) return null;
  try {
    const a = JSON.parse(raw) as Partial<Account>;
    return typeof a.userId === 'string' && typeof a.email === 'string' ? { userId: a.userId, email: a.email } : null;
  } catch {
    return null;
  }
}

export type SignInResult = { ok: true; account: Account } | { ok: false; reason: 'credentials' | 'connection' };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      const connection = !error || isAuthRetryableFetchError(error) || (error.status ?? 0) >= 500;
      return { ok: false, reason: connection ? 'connection' : 'credentials' };
    }
    const account = { userId: data.user.id, email: data.user.email ?? email.trim() };
    await deviceStore.set(ACCOUNT_KEY, JSON.stringify(account));
    return { ok: true, account };
  } catch {
    return { ok: false, reason: 'connection' };
  }
}

/**
 * La sesión vigente de ESA cuenta para hablar con el servidor. Nunca devuelve la de otra: si en el medio se entró con
 * otra cuenta, lo pendiente de la anterior no se sube a nombre de la nueva.
 */
export async function accessTokenFor(userId: string): Promise<string | null> {
  const result = await supabase.auth.getSession();
  if (result.data.session && result.data.session.user.id !== userId) return null;
  return tokenFrom(result);
}

/** Cierra la sesión de este teléfono. Funciona sin señal. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  await deviceStore.remove(ACCOUNT_KEY);
}
