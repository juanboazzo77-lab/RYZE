import { NextResponse, type NextRequest } from 'next/server';
import { syncEntitlementFromRevenueCat } from '@/server/billing/revenuecat';

/**
 * Webhook de RevenueCat (Integrations → Webhooks). Ante cualquier evento de
 * suscripción, no interpretamos el `type` — le preguntamos a la API de
 * RevenueCat el estado actual del suscriptor y lo guardamos tal cual.
 * Auth: header `Authorization` debe matchear `REVENUECAT_WEBHOOK_AUTH` (el
 * mismo valor configurado como "Authorization header value" del webhook).
 */

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected) {
    return NextResponse.json({ error: 'REVENUECAT_WEBHOOK_AUTH no configurado' }, { status: 503 });
  }
  if (req.headers.get('authorization') !== expected) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  }

  const body = (await req.json()) as { event?: { app_user_id?: string; type?: string } };
  const appUserId = body.event?.app_user_id;
  if (!appUserId) {
    return NextResponse.json({ error: 'event.app_user_id faltante' }, { status: 400 });
  }

  try {
    await syncEntitlementFromRevenueCat(appUserId);
  } catch (e) {
    console.error('[webhooks/revenuecat]', body.event?.type, appUserId, (e as Error).message);
    // 200 igual: RevenueCat reintenta con backoff si devolvemos error, y un
    // usuario sin entitlement en nuestra base (p. ej. borrado) no debe
    // generar reintentos infinitos.
  }

  return NextResponse.json({ ok: true });
}
