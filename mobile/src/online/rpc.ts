/**
 * Las funciones que necesitan internet (coach y demás) corren en el servidor, las mismas que usa la web. A diferencia de
 * lo que se anota sin señal, esto no se encola: si no hay conexión se avisa en el momento.
 */

/** La IA puede tardar bastante en contestar. */
const TIMEOUT_MS = 150_000;

let tokenOf: (() => Promise<string | null>) | null = null;

/** La sesión de la cuenta abierta. */
export function setRpcSession(getToken: (() => Promise<string | null>) | null) {
  tokenOf = getToken;
}

export type RpcFailure = 'offline' | 'auth' | 'server';

export class RpcError extends Error {
  constructor(public readonly kind: RpcFailure) {
    super(kind);
    this.name = 'RpcError';
  }
}

/** Avisa que algo cambió en el servidor: la app vuelve a bajar sus datos. */
export const serverChanged = () => window.dispatchEvent(new Event('forza:server-changed'));

export async function rpc<T>(action: string, ...args: unknown[]): Promise<T> {
  if (!navigator.onLine) throw new RpcError('offline');
  let token: string | null;
  try {
    token = tokenOf ? await tokenOf() : null;
  } catch {
    throw new RpcError('offline');
  }
  if (!token) throw new RpcError('auth');

  let res: Response;
  const abort = new AbortController();
  const timer = window.setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    res = await fetch(`${__API_URL__}/api/mobile/v1/rpc`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ action, args }),
      signal: abort.signal,
    });
  } catch {
    throw new RpcError('offline');
  } finally {
    window.clearTimeout(timer);
  }
  if (res.status === 401) {
    // La sincronización muestra el botón para volver a entrar.
    serverChanged();
    throw new RpcError('auth');
  }
  if (!res.ok) throw new RpcError('server');
  try {
    return ((await res.json()) as { result: T }).result;
  } catch {
    throw new RpcError('server');
  }
}
