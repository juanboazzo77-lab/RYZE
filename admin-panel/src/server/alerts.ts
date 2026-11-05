import 'server-only';

/**
 * Avisos por mail al equipo (gestion@forzaai.app) con Resend. Si falta RESEND_API_KEY no hace nada, y
 * nunca tira una excepción.
 */

const DEFAULT_TO = 'gestion@forzaai.app';
const DEFAULT_FROM = 'Forza AI Alertas <alertas@mail.forzaai.app>';

export function alertsConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendAlert(args: { subject: string; text: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.ALERT_EMAIL_FROM || DEFAULT_FROM,
        to: [process.env.ALERT_EMAIL_TO || DEFAULT_TO],
        subject: args.subject.slice(0, 200),
        text: args.text.slice(0, 20000),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error('[alerts] Resend respondió', res.status, (await res.text().catch(() => '')).slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error('[alerts] no se pudo enviar', e instanceof Error ? e.message : e);
    return false;
  }
}
