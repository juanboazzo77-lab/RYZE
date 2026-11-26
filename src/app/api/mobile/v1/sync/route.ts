import { NextResponse } from 'next/server';
import { pushRequestSchema, type PushResponse } from '@/lib/sync/protocol';
import { completedWorkoutSchema, WORKOUT_OP } from '@/lib/sync/workout';
import { forUser } from '@/server/user-db';
import { applyOperations } from '@/server/mobile/apply';
import { authenticateMobile } from '@/server/mobile/auth';
import { buildHandlers, type MobileTx } from '@/server/mobile/handlers';
import { mobileHeaders } from '@/server/mobile/route-headers';
import { prismaSyncLog } from '@/server/mobile/sync-log';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Una tanda normal (50 cambios) ocupa unos pocos kilobytes. */
const MAX_BODY_CHARS = 256 * 1024;

export function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: mobileHeaders(request) });
}

/** Puerta de entrada de la app independiente: recibe lo que la persona hizo (con o sin señal) y lo aplica. */
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
    const parsed = pushRequestSchema.safeParse(json);
    if (!parsed.success) return reply({ error: 'INVALID' }, 400);

    const { userId, timezone } = auth;
    const db = forUser(userId);
    const log = prismaSyncLog({
      userId,
      // El cliente acotado tiene otro tipo en Prisma; las operaciones son las mismas.
      db: db as unknown as MobileTx,
      // La base de la transacción sigue acotada a la persona.
      transaction: (run) => db.$transaction((tx) => run(tx as unknown as MobileTx)),
    });
    const results = await applyOperations({
      operations: parsed.data.operations.map((o) => ({ ...o, payload: o.payload })),
      log,
      handlers: buildHandlers({ userId, timezone }),
      now: new Date(),
      onError: (op, e) => console.error('[mobile/sync] quedó pendiente', op.type, op.id, e instanceof Error ? e.message : e),
    });

    // Lo mismo que hace la web al guardar: récords y logros. Nunca frenan la sincronización.
    const applied = new Set(results.filter((r) => r.status === 'applied').map((r) => r.id));
    const done = parsed.data.operations.filter((o) => applied.has(o.id));
    for (const o of done.filter((x) => x.type === WORKOUT_OP)) {
      const w = completedWorkoutSchema.safeParse(o.payload);
      if (!w.success) continue;
      try {
        const saved = await db.workout.findFirst({ where: { id: w.data.workoutId }, select: { finishedAt: true } });
        const { detectAndRecordPrs } = await import('@/features/training/pr-detect');
        if (saved?.finishedAt) await detectAndRecordPrs(db, userId, w.data.workoutId, saved.finishedAt);
      } catch (e) {
        console.error('[mobile/sync] récords', e instanceof Error ? e.message : e);
      }
    }
    if (done.length > 0) {
      try {
        const { syncAchievements } = await import('@/features/gamification/sync');
        await syncAchievements(db, userId, timezone);
      } catch (e) {
        console.error('[mobile/sync] logros', e instanceof Error ? e.message : e);
      }
    }

    return reply({ results } satisfies PushResponse, 200);
  } catch (e) {
    console.error('[mobile/sync] falló', e instanceof Error ? e.message : e);
    return reply({ error: 'SERVER' }, 500);
  }
}
