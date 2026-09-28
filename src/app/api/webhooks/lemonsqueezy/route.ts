import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { syncEntitlementFromLemonSqueezySubscription } from '@/server/billing/lemonsqueezy';

/**
 * Webhook de Lemon Squeezy (Settings → Webhooks). Verificamos la firma HMAC
 * del body crudo y, ante cualquier evento de suscripción, re-consultamos el
 * estado real (mismo patrón que RevenueCat/Stripe) en vez de confiar en el
 * payload del evento.
 */

export const dynamic = 'force-dynamic';

function validSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

const RELEVANT = new Set([
  'subscription_created',
  'subscription_updated',
  'subscription_cancelled',
  'subscription_resumed',
  'subscription_expired',
  'subscription_paused',
  'subscription_unpaused',
]);

export async function POST(req: NextRequest) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'LEMONSQUEEZY_WEBHOOK_SECRET no configurado' }, { status: 503 });
  }

  const rawBody = await req.text();
  if (!validSignature(rawBody, req.headers.get('x-signature'), secret)) {
    return NextResponse.json({ error: 'firma inválida' }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as {
    meta?: { event_name?: string; custom_data?: { user_id?: string } };
    data?: { id?: string };
  };
  const eventName = body.meta?.event_name;
  const userId = body.meta?.custom_data?.user_id;
  const subscriptionId = body.data?.id;

  if (!eventName || !RELEVANT.has(eventName) || !userId || !subscriptionId) {
    return NextResponse.json({ ok: true });
  }

  try {
    await syncEntitlementFromLemonSqueezySubscription(subscriptionId, userId);
  } catch (e) {
    console.error('[webhooks/lemonsqueezy]', eventName, userId, (e as Error).message);
    // 200 igual: Lemon Squeezy reintenta con backoff si devolvemos error, y un
    // usuario sin entitlement en nuestra base no debe generar reintentos infinitos.
  }

  return NextResponse.json({ ok: true });
}
