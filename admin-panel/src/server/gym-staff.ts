import 'server-only';
import { prisma } from './db';
import { sendMail } from './alerts';
import { composeEmail } from './email-template';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase-admin';
import { cleanStaff, MAX_STAFF, STAFF_ROLES, type StaffRole } from '@/features/gym/staff';

/**
 * Equipo del gimnasio: el dueño le da acceso a su panel a recepción y a sus profes, con permisos limitados. Se entra con
 * el mail; si la persona no tiene cuenta, se le crea y se le manda un enlace para elegir su contraseña.
 */

export interface StaffRow {
  id: string;
  email: string;
  role: StaffRole;
  createdAt: string;
}

async function ownedGym(ownerUserId: string, gymId: string) {
  return prisma.gym.findFirst({ where: { id: gymId, ownerUserId, status: { in: ['ACTIVE', 'SUSPENDED', 'PENDING'] } }, select: { id: true, name: true } });
}

export async function listStaff(ownerUserId: string, gymId: string): Promise<StaffRow[] | null> {
  if (!(await ownedGym(ownerUserId, gymId))) return null;
  const rows = await prisma.gymStaff.findMany({ where: { gymId }, orderBy: { createdAt: 'asc' } });
  return rows.flatMap((r) => (r.role === 'RECEPTION' || r.role === 'COACH' ? [{ id: r.id, email: r.email, role: r.role as StaffRole, createdAt: r.createdAt.toISOString() }] : []));
}

export type AddStaffResult = { ok: true; emailSent: boolean; created: boolean } | { error: 'NOT_OWNER' | 'EMAIL' | 'ROLE' | 'TOO_MANY' | 'IS_OWNER' | 'NOT_CONFIGURED' | 'CREATE_FAILED' };

const PANEL = () => (process.env.NEXT_PUBLIC_APP_URL ?? 'https://panel.forzaai.app').replace(/\/$/, '');

/** Le da acceso a una persona (la cambia de rol si ya estaba) y le manda el mail con cómo entrar. */
export async function addStaff(ownerUserId: string, gymId: string, raw: { email?: unknown; role?: unknown }): Promise<AddStaffResult> {
  const gym = await ownedGym(ownerUserId, gymId);
  if (!gym) return { error: 'NOT_OWNER' };
  const input = cleanStaff(raw);
  if ('error' in input) return input;
  const owner = await prisma.profile.findUnique({ where: { id: ownerUserId }, select: { email: true } });
  if (owner?.email?.toLowerCase() === input.email) return { error: 'IS_OWNER' };
  if ((await prisma.gymStaff.count({ where: { gymId } })) >= MAX_STAFF && !(await prisma.gymStaff.findUnique({ where: { gymId_email: { gymId, email: input.email } } }))) return { error: 'TOO_MANY' };

  // Si la persona no tiene cuenta, se le crea (con el mail confirmado) y se le manda un enlace para elegir contraseña.
  let created = false;
  let link: string | null = null;
  const existing = await prisma.profile.findFirst({ where: { email: { equals: input.email, mode: 'insensitive' } }, select: { id: true } });
  if (!existing) {
    if (!supabaseAdminConfigured()) return { error: 'NOT_CONFIGURED' };
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.createUser({ email: input.email, email_confirm: true });
    if (error || !data.user) {
      console.error('[equipo] no se pudo crear la cuenta:', error?.message);
      return { error: 'CREATE_FAILED' };
    }
    created = true;
    await prisma.profile.upsert({ where: { id: data.user.id }, update: {}, create: { id: data.user.id, email: input.email } });
    await prisma.entitlement.upsert({ where: { userId: data.user.id }, update: {}, create: { userId: data.user.id } });
    const gen = await admin.auth.admin.generateLink({ type: 'recovery', email: input.email });
    const hashed = gen.data?.properties?.hashed_token;
    if (hashed) link = `${PANEL()}/auth/confirm?token_hash=${encodeURIComponent(hashed)}&type=recovery`;
  }

  await prisma.gymStaff.upsert({ where: { gymId_email: { gymId, email: input.email } }, create: { gymId, email: input.email, role: input.role }, update: { role: input.role } });

  const roleLabel = STAFF_ROLES.find((r) => r.key === input.role)?.label.toLowerCase() ?? input.role;
  const mail = composeEmail({
    subject: `Te dieron acceso al panel de ${gym.name}`,
    preheader: `Entrá con este mail como ${roleLabel}.`,
    heading: `Ya podés entrar al panel de ${gym.name}`,
    blocks: [
      { type: 'p', text: `${gym.name} te dio acceso a su panel en Forza AI como ${roleLabel}.` },
      ...(link ? [{ type: 'p' as const, text: 'Elegí tu contraseña con este enlace (sirve una sola vez y vence en poco tiempo):' }, { type: 'button' as const, label: 'Elegir mi contraseña', url: link }] : [{ type: 'p' as const, text: 'Entrá con este mismo mail:' }]),
      { type: 'button', label: 'Entrar al panel', url: `${PANEL()}/login` },
      { type: 'note', text: 'Es una página web (no la app del celular). Si no esperabas este mensaje, ignoralo.' },
    ],
  });
  const emailSent = await sendMail({ to: input.email, subject: mail.subject, text: mail.text, html: mail.html });
  return { ok: true, emailSent, created };
}

/** Le saca el acceso a una persona del equipo. */
export async function removeStaff(ownerUserId: string, gymId: string, id: string): Promise<boolean> {
  if (!(await ownedGym(ownerUserId, gymId))) return false;
  const res = await prisma.gymStaff.deleteMany({ where: { id, gymId } });
  return res.count > 0;
}
