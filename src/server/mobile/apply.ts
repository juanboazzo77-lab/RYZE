import type { Operation, OperationResult } from '@/lib/sync/protocol';

/**
 * Cómo el servidor aplica lo que sube la app. Sin base de datos ni nada de Next acá adentro, para poder probar las
 * reglas por separado:
 *   - cada operación se aplica una sola vez, aunque el teléfono la reintente;
 *   - en orden; ante una falla pasajera se corta y el resto queda para después;
 *   - lo que nunca se va a poder aplicar se rechaza (el teléfono lo muestra, no lo borra);
 *   - lo que este servidor todavía no sabe recibir (una app más nueva) NO se rechaza: queda pendiente en el teléfono.
 */

export class RejectedOperation extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'RejectedOperation';
  }
}

export interface SyncRecord {
  status: 'applied' | 'rejected';
  reason: string | null;
}

export interface SyncLog<Tx> {
  find(opId: string): Promise<SyncRecord | null>;
  /** Hace el cambio y anota la operación como aplicada: las dos cosas o ninguna. */
  applyOnce(op: Operation, at: Date, change: (tx: Tx) => Promise<void>): Promise<void>;
  recordRejected(op: Operation, at: Date, reason: string): Promise<void>;
}

/** Hace el cambio de un tipo de operación. `at` es cuándo lo hizo la persona. */
export type Handler<Tx> = (tx: Tx, args: { payload: unknown; at: Date }) => Promise<void>;

const resultOf = (id: string, record: SyncRecord): OperationResult =>
  record.status === 'rejected' ? { id, status: 'rejected', reason: record.reason ?? 'REJECTED' } : { id, status: 'duplicate' };

export async function applyOperations<Tx>({
  operations,
  log,
  handlers,
  now,
  onError,
}: {
  operations: Operation[];
  log: SyncLog<Tx>;
  handlers: Record<string, Handler<Tx>>;
  now: Date;
  onError?: (op: Operation, error: unknown) => void;
}): Promise<OperationResult[]> {
  const results: OperationResult[] = [];
  for (const op of operations) {
    // Un teléfono con el reloj adelantado no puede "ganarle" a cambios que todavía no pasaron.
    const at = new Date(Math.min(Date.parse(op.createdAt), now.getTime()));
    try {
      const seen = await log.find(op.id);
      if (seen) {
        results.push(resultOf(op.id, seen));
        continue;
      }
      const handler = Object.hasOwn(handlers, op.type) ? handlers[op.type] : undefined;
      // Se corta acá: sigue en la cola del teléfono (y lo que viene después, para no desordenar) hasta que el
      // servidor lo sepa recibir. Rechazarlo lo sacaría de la cola para siempre.
      if (!handler) throw new Error('TIPO_DESCONOCIDO ' + op.type);
      try {
        await log.applyOnce(op, at, (tx) => handler(tx, { payload: op.payload, at }));
        results.push({ id: op.id, status: 'applied' });
      } catch (e) {
        if (e instanceof RejectedOperation) {
          await log.recordRejected(op, at, e.reason);
          results.push({ id: op.id, status: 'rejected', reason: e.reason });
          continue;
        }
        // Dos envíos del mismo cambio a la vez: el otro ganó y este se deshizo.
        const other = await log.find(op.id);
        if (!other) throw e;
        results.push(resultOf(op.id, other));
      }
    } catch (e) {
      onError?.(op, e);
      break;
    }
  }
  return results;
}
