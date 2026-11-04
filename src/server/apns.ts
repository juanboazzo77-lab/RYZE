import 'server-only';
import http2 from 'node:http2';
import { createPrivateKey, sign } from 'node:crypto';
import { prisma } from './db';

/**
 * Notificaciones remotas a la app de iPhone (APNs), sin librerías: HTTP/2 + un token JWT firmado con
 * la clave .p8 de Apple. Variables (todas en Vercel):
 *   APNS_KEY_P8     contenido del archivo .p8 (con o sin los saltos de línea; también sirve en base64)
 *   APNS_KEY_ID     el Key ID de esa clave (10 caracteres)
 *   APNS_TEAM_ID    el Team ID de la cuenta de desarrollador (10 caracteres)
 *   APNS_BUNDLE_ID  opcional; por defecto app.forzaai.mobile
 * Si falta alguna, no se envía nada (y no se rompe nada).
 */

const DEFAULT_BUNDLE = 'app.forzaai.mobile';

export function apnsConfigured(): boolean {
  return Boolean(process.env.APNS_KEY_P8 && process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID);
}

/** Acepta el .p8 pegado tal cual, con "\n" literales o en base64. */
function readKey(): string {
  let raw = (process.env.APNS_KEY_P8 ?? '').trim();
  if (!raw.includes('BEGIN')) {
    try {
      raw = Buffer.from(raw, 'base64').toString('utf8');
    } catch {
      /* queda como estaba */
    }
  }
  return raw.replace(/\\n/g, '\n');
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');

let cached: { jwt: string; at: number } | null = null;
/** Apple pide renovar el token entre cada 20 y 60 minutos. */
function providerToken(): string {
  const now = Math.floor(Date.now() / 1000);
  if (cached && now - cached.at < 40 * 60) return cached.jwt;
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: process.env.APNS_KEY_ID }));
  const claims = b64url(JSON.stringify({ iss: process.env.APNS_TEAM_ID, iat: now }));
  const signature = sign('sha256', Buffer.from(`${header}.${claims}`), {
    key: createPrivateKey(readKey()),
    dsaEncoding: 'ieee-p1363',
  });
  const jwt = `${header}.${claims}.${b64url(signature)}`;
  cached = { jwt, at: now };
  return jwt;
}

interface ApnsResult {
  status: number;
  reason?: string;
}

function post(host: string, deviceToken: string, body: string, jwt: string, topic: string, collapseId?: string): Promise<ApnsResult> {
  return new Promise((resolve) => {
    const client = http2.connect(`https://${host}`);
    let done = false;
    const finish = (r: ApnsResult) => {
      if (done) return;
      done = true;
      try {
        client.close();
      } catch {
        /* nada */
      }
      resolve(r);
    };
    client.on('error', (e) => finish({ status: 0, reason: e.message }));
    client.setTimeout(8000, () => finish({ status: 0, reason: 'timeout' }));

    const headers: Record<string, string | number> = {
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': topic,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    };
    if (collapseId) headers['apns-collapse-id'] = collapseId.slice(0, 64);
    const req = client.request(headers);
    let status = 0;
    let data = '';
    req.setEncoding('utf8');
    req.on('response', (h) => {
      status = Number(h[':status'] ?? 0);
    });
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      let reason: string | undefined;
      try {
        reason = data ? (JSON.parse(data) as { reason?: string }).reason : undefined;
      } catch {
        /* sin cuerpo */
      }
      finish({ status, reason });
    });
    req.on('error', (e) => finish({ status: 0, reason: e.message }));
    req.end(body);
  });
}

export interface NativePush {
  title: string;
  body?: string;
  /** Ruta de la app a abrir al tocar el aviso. */
  url?: string;
  /** Avisos con el mismo tag se reemplazan entre sí. */
  tag?: string;
}

/** Manda el aviso a todos los iPhones del usuario. Borra los tokens que Apple dice que ya no sirven. */
export async function sendApnsToUser(userId: string, push: NativePush): Promise<{ sent: number; removed: number }> {
  if (!apnsConfigured()) {
    console.warn('[apns] faltan variables APNS_*: no se envía');
    return { sent: 0, removed: 0 };
  }
  const tokens = await prisma.deviceToken.findMany({ where: { userId, platform: 'ios' } });
  if (tokens.length === 0) {
    console.log('[apns] el destinatario no tiene iPhone registrado');
    return { sent: 0, removed: 0 };
  }

  let jwt: string;
  try {
    jwt = providerToken();
  } catch (e) {
    console.error('[apns] la clave .p8 no es válida', e instanceof Error ? e.message : e);
    return { sent: 0, removed: 0 };
  }
  const topic = process.env.APNS_BUNDLE_ID || DEFAULT_BUNDLE;
  const payload = JSON.stringify({
    aps: { alert: { title: push.title, ...(push.body ? { body: push.body } : {}) }, sound: 'default' },
    url: push.url ?? '/dashboard',
  });

  let sent = 0;
  let removed = 0;
  await Promise.all(
    tokens.map(async (t) => {
      // Las compilaciones de la App Store / TestFlight usan producción; las de Xcode, sandbox.
      let res = await post('api.push.apple.com', t.token, payload, jwt, topic, push.tag);
      if (res.status === 400 && res.reason === 'BadDeviceToken') {
        res = await post('api.sandbox.push.apple.com', t.token, payload, jwt, topic, push.tag);
      }
      console.log('[apns] respuesta de Apple', res.status, res.reason ?? 'ok');
      if (res.status === 200) sent++;
      else if (res.status === 410 || res.reason === 'BadDeviceToken' || res.reason === 'Unregistered' || res.reason === 'DeviceTokenNotForTopic') {
        await prisma.deviceToken.deleteMany({ where: { token: t.token } });
        removed++;
      } else {
        console.error('[apns] fallo al enviar', res.status, res.reason);
      }
    }),
  );
  return { sent, removed };
}

/** Prueba de diagnóstico (sólo admin): manda un aviso y devuelve lo que contestó Apple, sin borrar nada. */
export async function diagnoseApns(userId: string): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {
    configured: apnsConfigured(),
    keyIdLength: (process.env.APNS_KEY_ID ?? '').trim().length,
    teamIdLength: (process.env.APNS_TEAM_ID ?? '').trim().length,
    bundle: process.env.APNS_BUNDLE_ID || DEFAULT_BUNDLE,
  };
  if (!apnsConfigured()) return out;
  let jwt: string;
  try {
    jwt = providerToken();
    out.keyOk = true;
  } catch (e) {
    out.keyOk = false;
    out.keyError = e instanceof Error ? e.message.slice(0, 120) : 'error';
    return out;
  }
  const tokens = await prisma.deviceToken.findMany({ where: { userId, platform: 'ios' } });
  out.tokens = tokens.length;
  const topic = process.env.APNS_BUNDLE_ID || DEFAULT_BUNDLE;
  const payload = JSON.stringify({
    aps: { alert: { title: 'Forza AI', body: 'Prueba de aviso' }, sound: 'default' },
    url: '/dashboard',
  });
  const results: Array<Record<string, unknown>> = [];
  for (const t of tokens) {
    const prod = await post('api.push.apple.com', t.token, payload, jwt, topic);
    const entry: Record<string, unknown> = { token: `${t.token.slice(0, 6)}…`, production: `${prod.status} ${prod.reason ?? 'ok'}` };
    if (prod.status !== 200) {
      const sb = await post('api.sandbox.push.apple.com', t.token, payload, jwt, topic);
      entry.sandbox = `${sb.status} ${sb.reason ?? 'ok'}`;
    }
    results.push(entry);
  }
  out.results = results;
  return out;
}
