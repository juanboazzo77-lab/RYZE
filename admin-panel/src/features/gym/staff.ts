/**
 * Equipo del gimnasio: además del dueño, el gimnasio puede darle acceso a su panel a recepción y a sus profes, con
 * permisos limitados. Qué puede ver cada rol se decide por la dirección de la pantalla. Funciones puras.
 */

export type StaffRole = 'RECEPTION' | 'COACH';
export type PanelRole = 'OWNER' | StaffRole;

export const MAX_STAFF = 10;

export const STAFF_ROLES: Array<{ key: StaffRole; label: string; description: string }> = [
  { key: 'RECEPTION', label: 'Recepción', description: 'Clientes y cuotas, cobros, planes, clases y mensajes a clientes.' },
  { key: 'COACH', label: 'Profe', description: 'Clases, retos, rutinas y quién entrena.' },
];

const ALLOWED: Record<StaffRole, string[]> = {
  RECEPTION: ['/gym/clientes', '/gym/cobros', '/gym/planes', '/gym/clases', '/gym/mensajes', '/gym/avisos'],
  COACH: ['/gym/clases', '/gym/retos', '/gym/rutinas', '/gym/socios', '/gym/avisos'],
};

export const asStaffRole = (v: string): StaffRole | null => (v === 'RECEPTION' || v === 'COACH' ? v : null);

/** ¿Puede este rol abrir esta dirección? El dueño entra a todo; el equipo, solo a lo suyo (y al Resumen). */
export function pathAllowed(role: PanelRole, pathname: string): boolean {
  if (role === 'OWNER') return true;
  if (pathname === '/gym' || pathname === '/gym/') return true;
  return ALLOWED[role].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Las secciones del menú que ve este rol. */
export const sectionsFor = (role: PanelRole): string[] | 'ALL' => (role === 'OWNER' ? 'ALL' : ['/gym', ...ALLOWED[role]]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Valida el alta de una persona del equipo: mail y rol. */
export function cleanStaff(input: { email?: unknown; role?: unknown }): { email: string; role: StaffRole } | { error: 'EMAIL' | 'ROLE' } {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 200) return { error: 'EMAIL' };
  const role = asStaffRole(String(input.role ?? ''));
  if (!role) return { error: 'ROLE' };
  return { email, role };
}
