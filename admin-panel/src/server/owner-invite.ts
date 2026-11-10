import 'server-only';
import { headers } from 'next/headers';
import { prisma } from './db';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase-admin';
import { sendMail } from './alerts';
import { composeEmail, type ComposedEmail } from './email-template';
import { setGymOwner } from './gyms';

/**
 * Invitación a un dueño de gimnasio: si todavía no tiene cuenta de Forza AI se la crea con su mail, lo vincula al
 * gimnasio y le manda un mail con un enlace de un solo uso para que ELIJA su contraseña (nadie conoce ni
 * comparte una contraseña provisoria). Si ya tiene cuenta, solo se vincula y se le avisa.
 */

/** Dirección del panel (donde entran los dueños). Sin PANEL_URL, se usa la del sitio desde el que se manda la invitación. */
async function panelUrl(): Promise<string> {
  const fixed = process.env.PANEL_URL?.trim();
  if (fixed) return fixed.replace(/\/$/, '');
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    if (host) return `${h.get('x-forwarded-proto') ?? 'https'}://${host}`;
  } catch {
    // Fuera de una pantalla: sin dirección no hay enlace propio.
  }
  return 'https://panel.forzaai.app';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InviteError = 'NOT_CONFIGURED' | 'INVALID' | 'NOT_FOUND' | 'CREATE_FAILED' | 'LINK_FAILED';
export type InviteResult =
  | { ok: true; created: boolean; emailSent: boolean; /** Sólo si el mail no salió: para pasárselo a mano. */ link?: string }
  | { error: InviteError };

/** Mail al dueño según el caso. Función pura (se prueba sin base de datos). */
export function inviteEmail(args: { gymName: string; created: boolean; link?: string; panelUrl?: string }): ComposedEmail {
  const { gymName, created, link } = args;
  const panel = (args.panelUrl ?? 'https://panel.forzaai.app').replace(/\/$/, '');
  if (created && link) {
    return composeEmail({
      subject: `Tu acceso a Forza AI para ${gymName}`,
      preheader: 'Elegí tu contraseña y entrá a tu panel.',
      heading: `Ya podés entrar al panel de ${gymName}`,
      blocks: [
        { type: 'p', text: 'Hola,' },
        { type: 'p', text: `Te dimos acceso a "${gymName}" en Forza AI. Elegí tu contraseña con este enlace (sirve una sola vez y vence en poco tiempo):` },
        { type: 'button', label: 'Elegir mi contraseña', url: link },
        { type: 'p', text: `Después entrá a tu panel en ${panel}/login con este mismo mail y tu contraseña (es una página web, no la app del celular). Ahí cargás tus clientes y sus cuotas, imprimís tu QR para que tus clientes se sumen y paguen su plan por su cuenta, y armás tus rutinas, clases y retos.` },
        { type: 'note', text: 'Si el enlace venció, pedinos uno nuevo respondiendo este mail. Si no esperabas este mensaje, ignoralo.' },
      ],
    });
  }
  return composeEmail({
    subject: `Ya sos dueño de ${gymName} en Forza AI`,
    preheader: 'Tu cuenta ya está vinculada a tu gimnasio.',
    heading: `Ya sos dueño de ${gymName}`,
    blocks: [
      { type: 'p', text: 'Hola,' },
      { type: 'p', text: `Vinculamos tu cuenta de Forza AI con "${gymName}". Entrá a tu panel con tu mail: ahí cargás tus clientes y sus cuotas, imprimís tu QR para que tus clientes se sumen y paguen su plan por su cuenta, y armás tus rutinas, clases y retos.` },
      { type: 'button', label: 'Entrar a mi panel', url: `${panel}/login` },
    ],
  });
}

/** Arma el enlace de un solo uso que valida el panel (/auth/confirm) y lleva a elegir contraseña. */
export function passwordLink(hashedToken: string, baseUrl = 'https://panel.forzaai.app'): string {
  return `${baseUrl.replace(/\/$/, '')}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`;
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
    link = passwordLink(hashed, await panelUrl());
  }

  const mail = inviteEmail({ gymName: gym.name, created: Boolean(link), link, panelUrl: await panelUrl() });
  const emailSent = await sendMail({ to: email, subject: mail.subject, text: mail.text, html: mail.html });
  return { ok: true, created, emailSent, link: emailSent ? undefined : link };
}
