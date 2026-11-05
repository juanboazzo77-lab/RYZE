import 'server-only';
import { prisma } from './db';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase-admin';
import { sendMail } from './alerts';
import { setGymOwner } from './gyms';

/**
 * Invitación a un dueño de gimnasio: si todavía no tiene cuenta de Forza AI se la crea con su mail, lo vincula al
 * gimnasio y le manda un mail con un enlace de un solo uso para que ELIJA su contraseña (nadie conoce ni
 * comparte una contraseña provisoria). Si ya tiene cuenta, solo se vincula y se le avisa.
 */

const APP_URL = (process.env.APP_URL || 'https://www.forzaai.app').replace(/\/$/, '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InviteError = 'NOT_CONFIGURED' | 'INVALID' | 'NOT_FOUND' | 'CREATE_FAILED' | 'LINK_FAILED';
export type InviteResult =
  | { ok: true; created: boolean; emailSent: boolean; /** Sólo si el mail no salió: para pasárselo a mano. */ link?: string }
  | { error: InviteError };

/** Texto del mail según el caso. Función pura (se prueba sin base de datos). */
export function inviteEmail(args: { gymName: string; created: boolean; link?: string }): { subject: string; text: string } {
  const { gymName, created, link } = args;
  if (created && link) {
    return {
      subject: `Tu acceso a Forza AI para ${gymName}`,
      text: [
        'Hola,',
        '',
        `Te dimos acceso a "${gymName}" en Forza AI. Elegí tu contraseña con este enlace (sirve una sola vez y vence en poco tiempo):`,
        '',
        link,
        '',
        'Después entrá a Forza AI (en la app o en www.forzaai.app) con este mismo mail y tu contraseña. En Ajustes vas a ver "Mi gimnasio": ahí está el código para tus socios, el cupo, quiénes entrenan y la carga de tus máquinas.',
        '',
        'Si el enlace venció, pedinos uno nuevo respondiendo este mail. Si no esperabas este mensaje, ignoralo.',
        '',
        'Equipo de Forza AI · soporte@forzaai.app',
      ].join('\n'),
    };
  }
  return {
    subject: `Ya sos dueño de ${gymName} en Forza AI`,
    text: [
      'Hola,',
      '',
      `Vinculamos tu cuenta de Forza AI con "${gymName}". Entrá a Forza AI con tu cuenta de siempre y en Ajustes vas a ver "Mi gimnasio": ahí está el código para tus socios, el cupo, quiénes entrenan y la carga de tus máquinas.`,
      '',
      'Equipo de Forza AI · soporte@forzaai.app',
    ].join('\n'),
  };
}

/** Arma el enlace de un solo uso que valida la app (/auth/confirm) y lleva a elegir contraseña. */
export function passwordLink(hashedToken: string): string {
  return `${APP_URL}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=recovery&next=${encodeURIComponent('/reset-password')}`;
}

export async function inviteGymOwner(gymId: string, rawEmail: string, opts: { resend?: boolean } = {}): Promise<InviteResult> {
  if (!supabaseAdminConfigured()) return { error: 'NOT_CONFIGURED' };
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) return { error: 'INVALID' };
  const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { name: true } });
  if (!gym) return { error: 'NOT_FOUND' };

  const admin = createSupabaseAdminClient();
  const existing = await prisma.profile.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } });
  let created = false;

  if (!existing) {
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error || !data.user) {
      console.error('[owner-invite] no se pudo crear la cuenta:', error?.message);
      return { error: 'CREATE_FAILED' };
    }
    created = true;
    // La app crea estas filas sola al primer ingreso; las dejamos listas para poder vincular el gimnasio ahora.
    await prisma.profile.upsert({ where: { id: data.user.id }, update: {}, create: { id: data.user.id, email } });
    await prisma.entitlement.upsert({ where: { userId: data.user.id }, update: {}, create: { userId: data.user.id } });
  }

  const linked = await setGymOwner(gymId, email);
  if ('error' in linked) return { error: 'NOT_FOUND' };

  // Enlace para elegir contraseña: cuando la cuenta es nueva, o si el administrador pide reenviarlo.
  let link: string | undefined;
  if (created || opts.resend) {
    const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email });
    const hashed = data?.properties?.hashed_token;
    if (error || !hashed) {
      console.error('[owner-invite] no se pudo generar el enlace:', error?.message);
      return { error: 'LINK_FAILED' };
    }
    link = passwordLink(hashed);
  }

  const mail = inviteEmail({ gymName: gym.name, created: Boolean(link), link });
  const emailSent = await sendMail({ to: email, subject: mail.subject, text: mail.text });
  return { ok: true, created, emailSent, link: emailSent ? undefined : link };
}
