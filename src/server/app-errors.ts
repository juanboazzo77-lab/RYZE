import 'server-only';
import { createHash } from 'node:crypto';
import { prisma } from './db';
import { sendAlert } from './alerts';

/**
 * Registro de errores propio, para verlos y trabajarlos en /admin/errores. Un error "igual" (mismo
 * origen, mensaje y ruta) suma una vez más al mismo registro en vez de crear uno nuevo. Nunca tira
 * una excepción: registrar un error no puede romper nada.
 */

export interface ErrorReport {
  source: 'server' | 'client';
  message: string;
  stack?: string | null;
  path?: string | null;
  digest?: string | null;
  userId?: string | null;
  userAgent?: string | null;
}

const clip = (v: string | null | undefined, max: number) => (v ? v.slice(0, max) : null);

/** Saca ids y números de la ruta y del mensaje para que "el mismo error" agrupe aunque cambie el id. */
export function normalizeForGrouping(text: string): string {
  return text
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\b\d{3,}\b/g, ':n')
    .slice(0, 300);
}

export function fingerprintOf(r: Pick<ErrorReport, 'source' | 'message' | 'path'>): string {
  const raw = `${r.source}|${normalizeForGrouping(r.message)}|${normalizeForGrouping(r.path ?? '')}`;
  return createHash('sha1').update(raw).digest('hex');
}

/** Ruido que no vale la pena ver (redirecciones y "no encontrado" internos de Next, cancelaciones). */
export function isNoise(message: string): boolean {
  return /NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK|AbortError|ResizeObserver loop|Non-Error promise rejection/i.test(
    message,
  );
}

export async function recordError(r: ErrorReport): Promise<void> {
  try {
    const message = clip(r.message, 1000) ?? 'Error sin mensaje';
    if (isNoise(message)) return;
    const fingerprint = fingerprintOf({ source: r.source, message, path: r.path });
    const now = new Date();
    const known = await prisma.appError.findUnique({ where: { fingerprint }, select: { id: true } });
    await prisma.appError.upsert({
      where: { fingerprint },
      create: {
        fingerprint,
        source: r.source,
        message,
        stack: clip(r.stack, 4000),
        path: clip(r.path, 300),
        digest: clip(r.digest, 100),
        userId: r.userId ?? null,
        userAgent: clip(r.userAgent, 300),
      },
      // Si estaba resuelto y vuelve a pasar, se reabre: el arreglo no alcanzó.
      update: {
        count: { increment: 1 },
        lastSeen: now,
        status: 'OPEN',
        resolvedAt: null,
        digest: clip(r.digest, 100) ?? undefined,
        userId: r.userId ?? undefined,
        userAgent: clip(r.userAgent, 300) ?? undefined,
      },
    });
    // Un error que nunca se había visto avisa por mail; con freno para que una tormenta de errores no llene la casilla.
    if (!known) {
      const recentNew = await prisma.appError.count({ where: { firstSeen: { gte: new Date(Date.now() - 10 * 60 * 1000) } } });
      if (recentNew <= 5) {
        await sendAlert({
          subject: `Error nuevo en Forza AI: ${message.slice(0, 80)}`,
          text: [
            `Apareció un error que no se había visto.`,
            '',
            `Dónde: ${r.source === 'server' ? 'servidor' : 'pantalla'} · ${r.path ?? 'sin ruta'}`,
            `Mensaje: ${message}`,
            '',
            'Mirá el detalle y marcalo como resuelto en el panel de gestión, en Errores.',
          ].join('\n'),
        });
      }
    }
  } catch (e) {
    console.error('[app-errors] no se pudo registrar', e instanceof Error ? e.message : e);
  }
}
