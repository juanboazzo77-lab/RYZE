/**
 * FitAI — crea un usuario ya confirmado usando la service_role key de Supabase.
 * Evita depender del envío de emails de confirmación en desarrollo.
 *
 * Uso:
 *   pnpm bootstrap -- --email vos@ejemplo.com --password "algo-seguro-123"
 *
 * Después: entrá con ese email/contraseña en /login. El trigger `handle_new_user`
 * crea el profile + entitlement; te va a mandar al onboarding.
 */
import process from 'node:process';

try {
  process.loadEnvFile('.env');
} catch {
  console.error('No encontré .env en la raíz del proyecto. Creálo primero (ver SETUP.md).');
  process.exit(1);
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const email = argValue('--email') ?? process.env.BOOTSTRAP_EMAIL;
const password = argValue('--password') ?? process.env.BOOTSTRAP_PASSWORD;

if (!email || !password) {
  console.error('Uso: pnpm bootstrap -- --email vos@ejemplo.com --password "..."');
  process.exit(1);
}
if (password.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error('✗ No se pudo crear el usuario:', error.message);
    process.exit(1);
  }

  console.log(`✓ Usuario creado y confirmado: ${data.user?.email} (${data.user?.id})`);
  console.log('  Ahora: pnpm dev  ->  http://localhost:3000/login');
}

main();
