import { NextResponse } from 'next/server';
import { z } from 'zod';
import { recordError } from '@/server/app-errors';
import { getSession } from '@/server/context';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  message: z.string().min(1).max(1000),
  stack: z.string().max(4000).optional(),
  path: z.string().max(300).optional(),
  digest: z.string().max(100).optional(),
});

/** Freno simple por instancia: una misma IP no puede mandar más de 20 avisos por minuto. */
const hits = new Map<string, { n: number; at: number }>();
function tooMany(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.at > 60_000) {
    hits.set(ip, { n: 1, at: now });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  h.n += 1;
  return h.n > 20;
}

/**
 * La app avisa acá cuando una pantalla falla (límites de error de Next). Es pública a propósito (el error
 * puede ser justo el de la sesión), así que valida el tamaño, limita el ritmo y sólo guarda texto.
 */
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'desconocida';
  if (tooMany(ip)) return NextResponse.json({ ok: false }, { status: 429 });
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  let userId: string | null = null;
  try {
    userId = (await getSession())?.id ?? null;
  } catch {
    /* sin sesión no pasa nada */
  }
  await recordError({
    source: 'client',
    message: parsed.data.message,
    stack: parsed.data.stack,
    path: parsed.data.path,
    digest: parsed.data.digest,
    userId,
    userAgent: req.headers.get('user-agent'),
  });
  return NextResponse.json({ ok: true });
}
