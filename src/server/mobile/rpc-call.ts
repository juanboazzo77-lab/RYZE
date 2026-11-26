/**
 * Qué se le puede pedir a la puerta de funciones de la app, y la revisión del pedido. Sin dependencias del servidor,
 * para poder probarlo.
 */
import { z } from 'zod';

const callSchema = z.object({ action: z.string().max(80), args: z.array(z.unknown()).max(2) });

export type RpcFunction = (...args: never[]) => Promise<unknown>;
export type RpcTable = Record<string, () => Promise<RpcFunction>>;

export type RpcCall =
  | { status: 'ok'; load: () => Promise<RpcFunction>; args: unknown[] }
  | { status: 'invalid' }
  | { status: 'unknown' };

/** Sólo lo que está escrito en la lista: ni funciones heredadas ni nombres armados. */
export function readCall(table: RpcTable, body: unknown): RpcCall {
  const parsed = callSchema.safeParse(body);
  if (!parsed.success) return { status: 'invalid' };
  if (!Object.prototype.hasOwnProperty.call(table, parsed.data.action)) return { status: 'unknown' };
  return { status: 'ok', load: table[parsed.data.action]!, args: parsed.data.args };
}
