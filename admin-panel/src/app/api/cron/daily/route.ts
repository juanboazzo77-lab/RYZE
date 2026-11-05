import { NextResponse } from 'next/server';
import { getTodaySummary } from '@/server/admin-hub';
import { buildDigest } from '@/server/digest';
import { sendAlert } from '@/server/alerts';

export const dynamic = 'force-dynamic';

/**
 * Resumen diario por mail. Lo llama el cron de Vercel (ver vercel.json) con `Authorization: Bearer <CRON_SECRET>`.
 * Sin CRON_SECRET configurado, o con otro valor, no hace nada.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const summary = await getTodaySummary();
  const digest = buildDigest(summary);
  const sent = await sendAlert({ subject: digest.subject, text: digest.text });
  return NextResponse.json({ ok: true, sent, urgent: digest.urgent });
}
