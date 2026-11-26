import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { User } from '@supabase/supabase-js';

/**
 * La app no usa cookies: manda su sesión en cada pedido. Para que las funciones de la web (con sus mismas reglas y
 * límites de plan) sirvan también para la app, la puerta de la app las corre "como" la persona ya comprobada.
 *
 * Sólo vale dentro de esa llamada: fuera de `runAsMobileUser` todo sigue leyendo la sesión de las cookies. Nunca se
 * llena con nada que no haya validado Supabase (ver `auth.ts`).
 */
const store = new AsyncLocalStorage<User>();

export const runAsMobileUser = <T>(user: User, run: () => Promise<T>): Promise<T> => store.run(user, run);

export const currentMobileUser = (): User | null => store.getStore() ?? null;
