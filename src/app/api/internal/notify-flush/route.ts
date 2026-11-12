import { NextResponse, type NextRequest } from 'next/server';
import { deliverDueNotifications } from '@/server/notify-due';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * El panel de gimnasios, al publicar un mensaje, crea las notificaciones de los clientes conectados y llama acá para
 * que lleguen enseguida (el cron diario solo las entregaría al día siguiente). Solo entrega mensajes de gimnasio.
 * Auth: `Authorization: Bearer <NOTIFY_SECRET>` (el mismo valor en el panel y en la app).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.NOTIFY_SECRET;
  if (!secret) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  if (req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const res = await deliverDueNotifications({ kinds: ['GYM_MESSAGE'], take: 1000 });
  return NextResponse.json({ ok: true, ...res });
}
