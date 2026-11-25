import { z } from 'zod';

/**
 * Lo que la app independiente y el servidor se dicen para sincronizar. Lo usan los dos lados, así que acá no entra
 * nada que dependa del teléfono ni del servidor.
 */

export const PROTOCOL_VERSION = 1;
/** Cuántos cambios se mandan como máximo en cada envío. */
export const MAX_BATCH = 50;

export const operationSchema = z.object({
  /** Lo genera el teléfono. El servidor lo usa para no aplicar dos veces el mismo cambio. */
  id: z.string().uuid(),
  /** Qué se hizo, p. ej. "weight.log". */
  type: z.string().min(1).max(60),
  payload: z.unknown(),
  /** Cuándo lo hizo la persona (hora del teléfono), no cuándo se subió. */
  createdAt: z.string().datetime(),
});

export type Operation = z.infer<typeof operationSchema>;

export const pushRequestSchema = z.object({
  protocol: z.literal(PROTOCOL_VERSION),
  operations: z.array(operationSchema).min(1).max(MAX_BATCH),
});

export type OperationResult =
  /** Aplicado ahora, o ya se había aplicado antes (reintento): en los dos casos el teléfono lo da por subido. */
  | { id: string; status: 'applied' | 'duplicate' }
  /** El servidor no lo va a aceptar nunca (datos inválidos, el registro ya no existe…). No se reintenta. */
  | { id: string; status: 'rejected'; reason: string };

/**
 * El servidor aplica los cambios en orden. Si uno falla por un problema pasajero, corta ahí y devuelve sólo los que
 * procesó: el resto queda en el teléfono para el próximo intento y nunca se aplica fuera de orden.
 */
export interface PushResponse {
  results: OperationResult[];
}

/** Foto de los datos de la persona que el teléfono guarda para poder mostrarlos sin conexión. */
export interface Snapshot {
  protocol: number;
  takenAt: string;
  data: Record<string, unknown>;
}
