/** Forma de lo que devuelve `supabase.auth.getSession()`, sin depender de la librería. */
export interface SessionResult {
  data: { session: { access_token: string } | null };
  error: { name?: string; status?: number } | null;
}

/** Si el error es de conexión o del servidor (se reintenta) y no una sesión que dejó de valer. */
export function isRetryableAuthError(error: { name?: string; status?: number }): boolean {
  if (error.name === 'AuthRetryableFetchError') return true;
  const s = error.status;
  return s === undefined || s === 0 || s === 408 || s === 429 || s >= 500;
}

/**
 * La sesión para mandar al servidor. Distingue dos casos que no se pueden confundir:
 *   - no se pudo renovar porque no hay señal → error de conexión (se reintenta, la persona sigue adentro);
 *   - la sesión dejó de valer → null (se le pide iniciar sesión de nuevo, sin borrar nada).
 */
export function tokenFrom(result: SessionResult): string | null {
  if (result.data.session) return result.data.session.access_token;
  if (result.error && isRetryableAuthError(result.error)) throw new Error('SIN_CONEXION');
  return null;
}
