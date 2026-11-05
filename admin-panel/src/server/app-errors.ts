import 'server-only';
import { createHash } from 'node:crypto';
import { prisma } from './db';

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
  } catch (e) {
    console.error('[app-errors] no se pudo registrar', e instanceof Error ? e.message : e);
  }
}

export interface ErrorRow {
  id: string;
  source: string;
  message: string;
  stack: string | null;
  path: string | null;
  count: number;
  firstSeen: string;
  lastSeen: string;
  status: 'OPEN' | 'RESOLVED';
  userEmail: string | null;
}

export async function listErrors(status: 'OPEN' | 'RESOLVED', take = 100): Promise<ErrorRow[]> {
  const rows = await prisma.appError.findMany({
    where: { status },
    orderBy: { lastSeen: 'desc' },
    take,
  });
  const userIds = [...new Set(rows.map((r) => r.userId).filter((x): x is string => !!x))];
  const users = userIds.length
    ? await prisma.profile.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } })
    : [];
  const email = new Map(users.map((u) => [u.id, u.email]));
  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    message: r.message,
    stack: r.stack,
    path: r.path,
    count: r.count,
    firstSeen: r.firstSeen.toISOString(),
    lastSeen: r.lastSeen.toISOString(),
    status: r.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN',
    userEmail: r.userId ? (email.get(r.userId) ?? null) : null,
  }));
}

export async function setErrorStatus(id: string, status: 'OPEN' | 'RESOLVED'): Promise<boolean> {
  const res = await prisma.appError.updateMany({
    where: { id },
    data: { status, resolvedAt: status === 'RESOLVED' ? new Date() : null },
  });
  return res.count > 0;
}

/** Borra los resueltos de hace más de 30 días, para que la tabla no crezca sin fin. */
export async function pruneResolvedErrors(): Promise<number> {
  const res = await prisma.appError.deleteMany({
    where: { status: 'RESOLVED', resolvedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
  });
  return res.count;
}
