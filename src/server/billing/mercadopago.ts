import 'server-only';
import { prisma } from '../db';
import { DEFAULT_PRICE_ARS, buildPreapprovalBody, grantsAccess, mapMpStatus, payerEmailFor, priceFromEnv, type WebSubStatus } from './mercadopago-logic';

/**
 * Plan mensual por la web con Mercado Pago (Suscripciones), en pesos. La persona autoriza la suscripción en
 * Mercado Pago; Mercado Pago nos avisa (webhook) y acá consultamos su estado real con la clave del servidor antes de
 * dar o sacar el acceso. Nunca se confía en lo que diga el aviso por sí solo.
 *
 * Variables (proyecto `forza` de Vercel): MERCADOPAGO_ACCESS_TOKEN (clave del vendedor; de prueba o de producción),
 * MERCADOPAGO_WEBHOOK_SECRET (secreto de las notificaciones de la aplicación) y, solo fuera de producción, MERCADOPAGO_PRICE_ARS.
 * Solo para pruebas: MERCADOPAGO_TEST_PAYER_EMAIL (mail del comprador de prueba).
 */

const API = 'https://api.mercadopago.com';

export const mpConfigured = (): boolean => Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim());
/**
 * Precio mensual. En producción es siempre el precio oficial (DEFAULT_PRICE_ARS): una variable de prueba olvidada no puede
 * cobrar de menos. MERCADOPAGO_PRICE_ARS solo se usa fuera de producción (previews y pruebas).
 */
export const mpPriceArs = (): number => (process.env.VERCEL_ENV === 'production' ? DEFAULT_PRICE_ARS : priceFromEnv(process.env.MERCADOPAGO_PRICE_ARS));

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
  date_created?: string;
}

/**
 * Quien paga el plan por la página de un gimnasio queda conectado a ese gimnasio como socio con origen WEB: ve su marca,
 * rutinas, retos y clases. No se le cobra al gimnasio ni ocupa cupo (el gimnasio no paga por él: paga él mismo). Si el
 * plan se pausa o se cancela, deja de ser socio. Si ya es socio activo de un gimnasio (con su código), no se toca.
 */
export async function syncWebMembership(userId: string): Promise<void> {
  try {
    const row = await prisma.webSubscription.findUnique({ where: { userId }, select: { status: true, gymId: true } });
    if (!row) return;
    if (!grantsAccess(row.status)) {
      await prisma.gymMember.updateMany({ where: { userId, source: 'WEB', status: 'ACTIVE' }, data: { status: 'ENDED', endedAt: new Date() } });
      return;
    }
    if (!row.gymId) return;
    const gym = await prisma.gym.findFirst({ where: { id: row.gymId, status: 'ACTIVE' }, select: { id: true } });
    if (!gym) return;
    const existing = await prisma.gymMember.findUnique({ where: { userId }, select: { status: true, gymId: true } });
    if (existing?.status === 'ACTIVE' && existing.gymId !== gym.id) return;
    if (existing?.status !== 'ACTIVE') {
      await prisma.gymMember.upsert({
        where: { userId },
        create: { gymId: gym.id, userId, source: 'WEB' },
        update: { gymId: gym.id, status: 'ACTIVE', source: 'WEB', joinedAt: new Date(), endedAt: null },
      });
    }
    // Aparece en la lista de clientes del panel del gimnasio (sin control de cuota: paga su plan por su cuenta).
    const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    const email = profile?.email?.trim().toLowerCase();
    if (email && !email.endsWith('@sin-email.local')) {
      const has = await prisma.gymClient.findFirst({ where: { gymId: gym.id, active: true, email }, select: { id: true } });
      if (!has) {
        await prisma.gymClient.create({
          data: { gymId: gym.id, name: profile?.name?.trim() || email.split('@')[0]!, email, note: 'Se sumó por tu página y paga su plan de Forza AI por su cuenta.' },
        });
      }
    }
  } catch (e) {
    console.error('[mercadopago] no se pudo conectar la persona con su gimnasio:', e instanceof Error ? e.message : e);
  }
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
      body: JSON.stringify(buildPreapprovalBody({ userId: args.userId, email: payerEmailFor(args.email, process.env.MERCADOPAGO_TEST_PAYER_EMAIL), priceArs: mpPriceArs(), backUrl: args.backUrl })),
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
  if (!row) {
    // Puede ser una suscripción anterior de alguien que tocó "Activar" más de una vez: se busca por su dueño.
    const other = await mpFetch<MpPreapproval>(`/preapproval/${encodeURIComponent(preapprovalId)}`);
    const ref = other.external_reference ?? '';
    return /^[0-9a-f-]{36}$/i.test(ref) ? syncUserSubscription(ref) : null;
  }
  const mp = await mpFetch<MpPreapproval>(`/preapproval/${encodeURIComponent(preapprovalId)}`);
  if (mp.external_reference && mp.external_reference !== row.userId) {
    console.error('[mercadopago] la suscripción no es de esa persona; se ignora', preapprovalId);
    return null;
  }
  const status = mapMpStatus(mp.status);
  // Queda en los registros qué dijo Mercado Pago (sin datos personales): sirve para entender por qué un plan no se activa.
  console.log(`[mercadopago] suscripción ...${preapprovalId.slice(-6)}: Mercado Pago dice "${mp.status ?? 'sin estado'}" → ${status}`);
  await prisma.webSubscription.update({
    where: { id: row.id },
    data: { status, nextPaymentAt: mp.next_payment_date ? new Date(mp.next_payment_date) : null },
  });
  await syncWebMembership(row.userId);
  return status;
}

/**
 * Busca en Mercado Pago TODAS las suscripciones de esta persona (por su identificador) y deja guardada la que
 * corresponde: la autorizada si hay una, y si no, la más reciente. Así no importa cuántas veces haya tocado "Activar"
 * ni cuál pagó. Solo para quien ya inició un pago desde nuestro sistema.
 */
export async function syncUserSubscription(userId: string): Promise<WebSubStatus | null> {
  if (!mpConfigured()) return null;
  const row = await prisma.webSubscription.findUnique({ where: { userId } });
  if (!row) return null;
  const found = await mpFetch<{ results?: MpPreapproval[] }>(`/preapproval/search?external_reference=${encodeURIComponent(userId)}&limit=20`);
  const list = (found.results ?? []).filter((p) => p.id && (!p.external_reference || p.external_reference === userId));
  if (list.length === 0) return null;
  const authorized = list.find((p) => mapMpStatus(p.status) === 'AUTHORIZED');
  const pick = authorized ?? [...list].sort((a, b) => (b.date_created ?? '').localeCompare(a.date_created ?? ''))[0]!;
  const status = mapMpStatus(pick.status);
  console.log(`[mercadopago] persona ...${userId.slice(-6)}: ${list.length} suscripción(es) en Mercado Pago; elegida ...${pick.id.slice(-6)} "${pick.status ?? 'sin estado'}" → ${status}`);
  await prisma.webSubscription.update({
    where: { id: row.id },
    data: { providerId: pick.id, status, nextPaymentAt: pick.next_payment_date ? new Date(pick.next_payment_date) : null },
  });
  await syncWebMembership(userId);
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

/**
 * Diagnóstico (solo administrador): le pregunta a Mercado Pago cómo ve ahora la suscripción de esta persona, la
 * sincroniza y devuelve lo que sirve para entender por qué un plan no se activa. Sin datos de tarjetas ni claves.
 */
export async function diagnoseSubscription(userId: string): Promise<Record<string, unknown>> {
  const row = await prisma.webSubscription.findUnique({ where: { userId } });
  if (!row) return { found: false };
  const mp: Record<string, unknown> = await mpFetch<Record<string, unknown>>(`/preapproval/${encodeURIComponent(row.providerId)}`).catch((e: unknown) => ({ error: e instanceof Error ? e.message : String(e) }));
  const failed = typeof mp.error === 'string';
  const ar = (mp.auto_recurring ?? {}) as Record<string, unknown>;
  const search = await mpFetch<{ results?: MpPreapproval[] }>(`/preapproval/search?external_reference=${encodeURIComponent(userId)}&limit=20`).catch(() => ({ results: [] as MpPreapproval[] }));
  const all = (search.results ?? []).map((p) => ({ id: `...${p.id.slice(-6)}`, status: p.status, created: p.date_created }));
  const synced = await syncUserSubscription(userId).catch(() => null);
  return {
    found: true,
    ours: { status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt },
    mercadoPago: failed ? mp : { status: mp.status, date_created: mp.date_created, last_modified: mp.last_modified, next_payment_date: mp.next_payment_date, payer_id_present: Boolean(mp.payer_id), amount: ar.transaction_amount, currency: ar.currency_id, frequency: ar.frequency, frequency_type: ar.frequency_type, reason: mp.reason },
    allSubscriptionsInMercadoPago: all,
    afterSync: synced,
  };
}
