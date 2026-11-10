import 'server-only';
import { prisma } from '../db';
import { buildPreapprovalBody, grantsAccess, mapMpStatus, priceFromEnv, type WebSubStatus } from './mercadopago-logic';

/**
 * Plan mensual por la web con Mercado Pago (Suscripciones), en pesos. La persona autoriza la suscripción en
 * Mercado Pago; Mercado Pago nos avisa (webhook) y acá consultamos su estado real con la clave del servidor antes de
 * dar o sacar el acceso. Nunca se confía en lo que diga el aviso por sí solo.
 *
 * Variables (proyecto `forza` de Vercel): MERCADOPAGO_ACCESS_TOKEN (clave del vendedor; de prueba o de producción),
 * MERCADOPAGO_WEBHOOK_SECRET (secreto de las notificaciones de la aplicación) y, opcional, MERCADOPAGO_PRICE_ARS.
 */

const API = 'https://api.mercadopago.com';

export const mpConfigured = (): boolean => Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim());
export const mpPriceArs = (): number => priceFromEnv(process.env.MERCADOPAGO_PRICE_ARS);

async function mpFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado');
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // El cuerpo no lleva datos de tarjetas; se recorta igual.
    throw new Error(`Mercado Pago respondió ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

interface MpPreapproval {
  id: string;
  status?: string;
  external_reference?: string;
  init_point?: string;
  next_payment_date?: string | null;
}

export type StartResult = { ok: true; url: string } | { error: 'NOT_CONFIGURED' | 'ALREADY_ACTIVE' | 'FAILED' };

/** Crea la suscripción de esta persona y devuelve la dirección de Mercado Pago donde la autoriza y paga. */
export async function startSubscription(args: { userId: string; email: string; gymId: string | null; backUrl: string }): Promise<StartResult> {
  if (!mpConfigured()) return { error: 'NOT_CONFIGURED' };
  const existing = await prisma.webSubscription.findUnique({ where: { userId: args.userId } });
  if (existing && grantsAccess(existing.status)) return { error: 'ALREADY_ACTIVE' };
  try {
    const created = await mpFetch<MpPreapproval>('/preapproval', {
      method: 'POST',
      body: JSON.stringify(buildPreapprovalBody({ userId: args.userId, email: args.email, priceArs: mpPriceArs(), backUrl: args.backUrl })),
    });
    if (!created.id || !created.init_point) return { error: 'FAILED' };
    await prisma.webSubscription.upsert({
      where: { userId: args.userId },
      create: { userId: args.userId, providerId: created.id, status: 'PENDING', gymId: args.gymId },
      // Una suscripción nueva reemplaza a la anterior (cancelada o que nunca se autorizó).
      update: { providerId: created.id, status: 'PENDING', gymId: args.gymId ?? undefined, nextPaymentAt: null },
    });
    return { ok: true, url: created.init_point };
  } catch (e) {
    console.error('[mercadopago] no se pudo crear la suscripción:', e instanceof Error ? e.message : e);
    return { error: 'FAILED' };
  }
}

/**
 * Trae de Mercado Pago el estado real de una suscripción y lo guarda. Solo toca suscripciones que nosotros creamos
 * (por su id) y comprueba que sean de la misma persona (external_reference).
 */
export async function syncSubscription(preapprovalId: string): Promise<WebSubStatus | null> {
  const row = await prisma.webSubscription.findUnique({ where: { providerId: preapprovalId } });
  if (!row) return null;
  const mp = await mpFetch<MpPreapproval>(`/preapproval/${encodeURIComponent(preapprovalId)}`);
  if (mp.external_reference && mp.external_reference !== row.userId) {
    console.error('[mercadopago] la suscripción no es de esa persona; se ignora', preapprovalId);
    return null;
  }
  const status = mapMpStatus(mp.status);
  await prisma.webSubscription.update({
    where: { id: row.id },
    data: { status, nextPaymentAt: mp.next_payment_date ? new Date(mp.next_payment_date) : null },
  });
  return status;
}

/** Un aviso de cobro mensual trae el id del pago; de ahí sale el id de la suscripción. */
export async function preapprovalIdOfPayment(authorizedPaymentId: string): Promise<string | null> {
  const p = await mpFetch<{ preapproval_id?: string }>(`/authorized_payments/${encodeURIComponent(authorizedPaymentId)}`);
  return p.preapproval_id ?? null;
}

/** ¿Esta persona tiene hoy el plan web activo? (suscripción autorizada) */
export async function hasActiveWebPlan(userId: string): Promise<boolean> {
  // Se consulta en cada pantalla: si falla (por ejemplo, mientras se aplica una migración), la app sigue como si no
  // hubiera plan web en vez de caerse.
  try {
    const row = await prisma.webSubscription.findUnique({ where: { userId }, select: { status: true } });
    return grantsAccess(row?.status);
  } catch (e) {
    console.error('[mercadopago] no se pudo consultar el plan web:', e instanceof Error ? e.message : e);
    return false;
  }
}

export async function getWebPlanStatus(userId: string): Promise<WebSubStatus | null> {
  try {
    const row = await prisma.webSubscription.findUnique({ where: { userId }, select: { status: true } });
    return row ? mapMpStatus(row.status) : null;
  } catch (e) {
    console.error('[mercadopago] no se pudo leer el estado del plan web:', e instanceof Error ? e.message : e);
    return null;
  }
}
