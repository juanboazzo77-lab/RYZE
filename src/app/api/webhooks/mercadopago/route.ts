import { NextResponse, type NextRequest } from 'next/server';
import { verifyMpSignature } from '@/server/billing/mercadopago-logic';
import { preapprovalIdOfPayment, syncSubscription } from '@/server/billing/mercadopago';

/**
 * Aviso automático (webhook) de Mercado Pago para las suscripciones. En tu aplicación de Mercado Pago:
 * Webhooks → URL de producción = https://www.forzaai.app/api/webhooks/mercadopago, con los eventos
 * "Planes y suscripciones" (suscripción y pago autorizado). El secreto que te da ahí va en MERCADOPAGO_WEBHOOK_SECRET.
 *
 * Seguridad: se comprueba la firma del aviso; y aun así no se confía en su contenido: se le pregunta a Mercado Pago
 * el estado real de la suscripción con la clave del servidor.
 */

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'MERCADOPAGO_WEBHOOK_SECRET no configurado' }, { status: 503 });

  let body: { type?: string; topic?: string; action?: string; data?: { id?: string | number } } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // Algunos avisos viejos llegan solo con parámetros en la dirección.
  }
  const url = req.nextUrl;
  const rawId = body.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id');
  const dataId = rawId === undefined || rawId === null ? null : String(rawId);
  const topic = body.type ?? body.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic') ?? '';

  const ok = verifyMpSignature({
    signatureHeader: req.headers.get('x-signature'),
    requestId: req.headers.get('x-request-id'),
    dataId: url.searchParams.get('data.id') ?? dataId,
    secret,
  });
  if (!ok) return NextResponse.json({ error: 'firma inválida' }, { status: 401 });
  if (!dataId) return NextResponse.json({ ok: true, ignored: 'sin id' });

  try {
    if (topic === 'subscription_preapproval') {
      await syncSubscription(dataId);
    } else if (topic === 'subscription_authorized_payment') {
      const preapprovalId = await preapprovalIdOfPayment(dataId);
      if (preapprovalId) await syncSubscription(preapprovalId);
    }
    // Cualquier otro tipo de aviso no nos interesa.
  } catch (e) {
    console.error('[webhooks/mercadopago]', topic, dataId, e instanceof Error ? e.message : e);
    // 500 para que Mercado Pago reintente: si falló la consulta, el estado quedó sin actualizar.
    return NextResponse.json({ error: 'no se pudo procesar' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
