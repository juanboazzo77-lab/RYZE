import 'server-only';
import { AiError } from '../errors';
import type { AiProvider } from './types';

/**
 * Proveedor con respaldo: prueba primero el principal y, si falla por algo que no
 * es culpa del usuario (sin crédito, clave inválida, saturación, tiempo agotado),
 * reintenta con el otro proveedor configurado. Así un problema de facturación o una
 * caída de un proveedor no deja toda la IA de la app sin funcionar.
 */

const FALLBACK_CODES = new Set([
  'NOT_CONFIGURED',
  'PROVIDER_ERROR',
  'TIMEOUT',
  'RATE_LIMITED',
  'BAD_REQUEST',
  'INVALID_OUTPUT',
]);

/** Mínimo de tiempo que se le deja al respaldo aunque el principal haya gastado casi todo. */
const MIN_BACKUP_MS = 20_000;

/** Tiempo para el respaldo: lo que queda del total, con un piso. Un error rápido (sin crédito, clave) deja casi todo. */
function backupTime(totalMs: number, startedAt: number): number {
  return Math.max(MIN_BACKUP_MS, totalMs - (Date.now() - startedAt));
}

export function withProviderFallback(
  primary: AiProvider,
  backup: AiProvider,
  backupModel: string,
): AiProvider {
  const shouldFallback = (e: unknown) => e instanceof AiError && FALLBACK_CODES.has(e.code);
  const log = (e: unknown) =>
    console.error(
      `[ai] ${primary.name} falló, reintento con ${backup.name}`,
      e instanceof Error ? e.message : String(e),
    );

  return {
    name: primary.name,
    isConfigured: () => primary.isConfigured() || backup.isConfigured(),

    async generate(req) {
      if (!primary.isConfigured()) return backup.generate({ ...req, model: backupModel });
      if (!backup.isConfigured()) return primary.generate(req);
      const t0 = Date.now();
      try {
        return await primary.generate(req);
      } catch (e) {
        if (!shouldFallback(e)) throw e;
        log(e);
        return backup.generate({ ...req, model: backupModel, timeoutMs: backupTime(req.timeoutMs, t0) });
      }
    },

    async generateStructured(req) {
      if (!primary.isConfigured()) return backup.generateStructured({ ...req, model: backupModel });
      if (!backup.isConfigured()) return primary.generateStructured(req);
      const t0 = Date.now();
      try {
        return await primary.generateStructured(req);
      } catch (e) {
        if (!shouldFallback(e)) throw e;
        log(e);
        return backup.generateStructured({
          ...req,
          model: backupModel,
          timeoutMs: backupTime(req.timeoutMs, t0),
        });
      }
    },
  };
}
