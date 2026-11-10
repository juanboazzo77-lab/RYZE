import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Lógica pura de la suscripción por Mercado Pago (sin red ni base de datos, para probarla sola).
 * Mercado Pago cobra el plan todos los meses en pesos y avisa por "webhook"; acá se arma el pedido de la
 * suscripción, se traducen sus estados y se comprueba la firma de los avisos.
 */

export const DEFAULT_PRICE_ARS = 5000;
export const PLAN_REASON = 'Forza AI · plan mensual';

export type WebSubStatus = 'PENDING' | 'AUTHORIZED' | 'PAUSED' | 'CANCELLED';

/** Estado de Mercado Pago → el nuestro. Lo que no se conoce queda PENDING (sin acceso). */
export function mapMpStatus(status: string | null | undefined): WebSubStatus {
  switch ((status ?? '').toLowerCase()) {
    case 'authorized':
      return 'AUTHORIZED';
    case 'paused':
      return 'PAUSED';
    case 'cancelled':
    case 'canceled':
      return 'CANCELLED';
    default:
      return 'PENDING';
  }
}

/** Precio mensual en pesos: el de MERCADOPAGO_PRICE_ARS si es un número razonable, y si no, $5.000. */
export function priceFromEnv(raw: string | null | undefined): number {
  const n = Number((raw ?? '').trim().replace(',', '.'));
  return Number.isFinite(n) && n >= 100 && n <= 10_000_000 ? Math.round(n * 100) / 100 : DEFAULT_PRICE_ARS;
}

/** El pedido para crear la suscripción: queda "pending" hasta que la persona la autoriza en Mercado Pago. */
export function buildPreapprovalBody(args: { userId: string; email: string; priceArs: number; backUrl: string }) {
  return {
    reason: PLAN_REASON,
    // Con esto sabemos de quién es cada aviso que llega después.
    external_reference: args.userId,
    payer_email: args.email,
    auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: args.priceArs, currency_id: 'ARS' },
    back_url: args.backUrl,
    status: 'pending',
  };
}

/** ¿Este estado da acceso al plan? Solo la suscripción autorizada. */
export const grantsAccess = (status: string | null | undefined): boolean => status === 'AUTHORIZED';

/**
 * Comprueba la firma de un aviso de Mercado Pago (encabezado `x-signature`: "ts=...,v1=..."). El texto firmado es
 * "id:<id del dato>;request-id:<x-request-id>;ts:<ts>;" y la clave, el secreto de las notificaciones de tu aplicación.
 * Si no se puede comprobar, es falso.
 */
export function verifyMpSignature(args: { signatureHeader: string | null; requestId: string | null; dataId: string | null; secret: string | undefined }): boolean {
  const { signatureHeader, requestId, dataId, secret } = args;
  if (!secret || !signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const i = p.indexOf('=');
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()] as const;
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  // Mercado Pago usa el id en minúsculas cuando es alfanumérico.
  const id = dataId ? dataId.toLowerCase() : '';
  const manifest = `${id ? `id:${id};` : ''}${requestId ? `request-id:${requestId};` : ''}ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(v1, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
