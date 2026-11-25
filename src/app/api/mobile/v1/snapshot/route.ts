import { NextResponse } from 'next/server';
import { forUser } from '@/server/user-db';
import { authenticateMobile } from '@/server/mobile/auth';
import { mobileHeaders } from '@/server/mobile/route-headers';
import { buildSnapshot, type SnapshotDb } from '@/server/mobile/snapshot';

export const dynamic = 'force-dynamic';

export function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: mobileHeaders(request) });
}

/** Los datos de la persona, para que la app los guarde y los muestre sin conexión. */
export async function GET(request: Request) {
  const headers = mobileHeaders(request);
  const reply = (body: unknown, status: number) => NextResponse.json(body, { status, headers });
  try {
    const auth = await authenticateMobile(request);
    if (auth.status === 'unauthorized') return reply({ error: 'UNAUTHORIZED' }, 401);
    if (auth.status === 'unavailable') return reply({ error: 'UNAVAILABLE' }, 503);
    const db = forUser(auth.userId) as unknown as SnapshotDb;
    return reply(await buildSnapshot(db, auth.userId, new Date()), 200);
  } catch (e) {
    console.error('[mobile/snapshot] falló', e instanceof Error ? e.message : e);
    return reply({ error: 'SERVER' }, 500);
  }
}
