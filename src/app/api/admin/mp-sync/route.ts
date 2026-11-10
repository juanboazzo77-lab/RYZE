import { NextResponse } from 'next/server';
import { getUserContext } from '@/server/context';
import { isAdmin } from '@/server/admin';
import { prisma } from '@/server/db';
import { diagnoseSubscription } from '@/server/billing/mercadopago';

export const dynamic = 'force-dynamic';

/**
 * Diagnóstico de una suscripción de Mercado Pago (solo admin): /api/admin/mp-sync?email=cuenta@de.la.persona
 * (sin email, la de tu propia cuenta). Le pregunta a Mercado Pago cómo la ve ahora, la sincroniza y muestra el resultado.
 */
export async function GET(req: Request) {
  const ctx = await getUserContext();
  if (!ctx || !isAdmin(ctx.email)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const email = new URL(req.url).searchParams.get('email')?.trim().toLowerCase();
  const target = email
    ? await prisma.profile.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } })
    : { id: ctx.userId };
  if (!target) return NextResponse.json({ error: 'cuenta no encontrada' }, { status: 404 });
  return NextResponse.json(await diagnoseSubscription(target.id));
}
