import { NextResponse } from 'next/server';
import { runAsMobileUser } from '@/server/mobile/as-user';
import { authenticateMobile } from '@/server/mobile/auth';
import { mobileHeaders } from '@/server/mobile/route-headers';
import { readCall } from '@/server/mobile/rpc-call';
import { RPC_TABLE } from '@/server/mobile/rpc-table';

export const dynamic = 'force-dynamic';

/** Deja lugar para una foto de comida (viaja como texto). */
const MAX_BODY_CHARS = 4 * 1024 * 1024;

export function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: mobileHeaders(request) });
}

/**
 * Lo que la app hace CON internet (coach y demás): corre la misma función que usa la web, como la persona que manda la
 * sesión. A diferencia de la sincronización, acá no se guarda nada para después.
 */
export async function POST(request: Request) {
  const headers = mobileHeaders(request);
  const reply = (body: unknown, status: number) => NextResponse.json(body, { status, headers });

  try {
    const auth = await authenticateMobile(request);
    if (auth.status === 'unauthorized') return reply({ error: 'UNAUTHORIZED' }, 401);
    if (auth.status === 'unavailable') return reply({ error: 'UNAVAILABLE' }, 503);

    const text = await request.text();
    if (text.length > MAX_BODY_CHARS) return reply({ error: 'TOO_LARGE' }, 413);
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* se responde abajo como pedido inválido */
    }
    const call = readCall(RPC_TABLE, json);
    if (call.status === 'invalid') return reply({ error: 'INVALID' }, 400);
    if (call.status === 'unknown') return reply({ error: 'UNKNOWN_ACTION' }, 404);

    const result = await runAsMobileUser(auth.user, async () => {
      const fn = (await call.load()) as (...args: unknown[]) => Promise<unknown>;
      return fn(...call.args);
    });
    return reply({ result: result ?? null }, 200);
  } catch (e) {
    console.error('[mobile/rpc] falló', e instanceof Error ? e.message : e);
    return reply({ error: 'SERVER' }, 500);
  }
}
