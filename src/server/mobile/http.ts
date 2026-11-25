/** Lo del pedido HTTP de la app que no necesita servidor (para poder probarlo). */

/** Desde dónde corre la app instalada: iPhone y Android sirven sus pantallas desde estas direcciones. */
const APP_ORIGINS = ['capacitor://localhost', 'https://localhost'];
/** La app corriendo en la computadora mientras se desarrolla. */
const DEV_ORIGINS = ['http://localhost:5175', 'http://127.0.0.1:5175'];

export function corsHeaders(origin: string | null, production: boolean): Record<string, string> {
  const allowed = production ? APP_ORIGINS : [...APP_ORIGINS, ...DEV_ORIGINS];
  if (!origin || !allowed.includes(origin)) return { Vary: 'Origin' };
  return {
    Vary: 'Origin',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Max-Age': '86400',
  };
}

export function bearerToken(header: string | null): string | null {
  const m = /^Bearer\s+([A-Za-z0-9._~+/=-]{20,4096})$/.exec(header?.trim() ?? '');
  return m?.[1] ?? null;
}

/** Si Supabase dijo que la sesión no vale (4xx) o si no se pudo averiguar (todo lo demás: se reintenta). */
export function isInvalidSession(status: number | undefined): boolean {
  return status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429;
}
