import { NextResponse } from 'next/server';
import { getUserContext } from '@/server/context';
import { isAdmin } from '@/server/admin';
import { prisma } from '@/server/db';
import { diagnoseApns } from '@/server/apns';

export const dynamic = 'force-dynamic';

/**
 * Diagnóstico de los avisos al iPhone (sólo admin): /api/admin/apns-test?email=cuenta@del.iphone
 * Manda un aviso de prueba a los iPhones de esa cuenta y muestra lo que contestó Apple.
 */
export async function GET(req: Request) {
  const ctx = await getUserContext();
  if (!ctx || !isAdmin(ctx.email)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const email = new URL(req.url).searchParams.get('email')?.trim().toLowerCase();
  const target = email
    ? await prisma.profile.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } })
    : { id: ctx.userId };
  if (!target) return NextResponse.json({ error: 'cuenta no encontrada' }, { status: 404 });
  return NextResponse.json(await diagnoseApns(target.id));
}
