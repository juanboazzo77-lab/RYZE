import 'server-only';

/**
 * Quién es administrador: los mails de `ADMIN_EMAILS` (separados por coma). Si la variable no está
 * definida, nadie. El panel de gestión es un sitio aparte (carpeta admin-panel); acá sólo queda esto, que
 * usan las rutas de diagnóstico internas.
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}
