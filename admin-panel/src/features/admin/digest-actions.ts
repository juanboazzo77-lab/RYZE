'use server';

import { requireAdmin } from '@/lib/admin';
import { getTodaySummary } from '@/server/admin-hub';
import { buildDigest } from '@/server/digest';
import { alertsConfigured, sendAlert } from '@/server/alerts';

/** Manda el resumen de hoy por mail (sólo administrador). */
export async function sendDigestNow(): Promise<{ ok?: boolean; error?: 'NOT_CONFIGURED' | 'SEND_FAILED' }> {
  await requireAdmin();
  if (!alertsConfigured()) return { error: 'NOT_CONFIGURED' };
  const digest = buildDigest(await getTodaySummary());
  const ok = await sendAlert({ subject: digest.subject, text: digest.text });
  return ok ? { ok: true } : { error: 'SEND_FAILED' };
}
