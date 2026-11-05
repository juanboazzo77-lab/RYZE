import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase con la clave de servicio: puede crear cuentas y generar enlaces sin pasar por el
 * navegador de nadie. SOLO servidor, SOLO para el administrador (cada acción que lo usa vuelve a comprobarlo).
 * Necesita SUPABASE_SERVICE_ROLE_KEY en las variables del panel.
 */
export function supabaseAdminConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createSupabaseAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
