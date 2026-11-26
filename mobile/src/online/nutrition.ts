/**
 * Lo de la alimentación que necesita internet: el código de barras, la foto, la descripción y guardar un producto nuevo.
 * Son las mismas funciones del servidor que usa la web. Anotar la comida no pasa por acá: se guarda en el teléfono.
 */
import type * as web from '@/features/nutrition/actions';
import type { EstimateResult } from '@/features/nutrition/ai-tabs';
import type { AppText } from '../strings';
import { rpc, RpcError, serverChanged } from './rpc';

type Actions = typeof web;

const failureCode = (e: unknown) => (e instanceof RpcError ? e.kind : 'server');

/** El texto de las fallas propias de la app; el resto de los errores los explica la pantalla compartida. */
export function onlineErrorText(s: AppText, code: string | undefined): string | undefined {
  if (code === 'offline') return s.cannotConnect;
  if (code === 'auth') return s.sessionExpired;
  if (code === 'server') return s.onlineFailed;
  return undefined;
}

export const lookupBarcode: Actions['lookupBarcodeAction'] = (code) =>
  rpc<Awaited<ReturnType<Actions['lookupBarcodeAction']>>>('food.lookupBarcode', code);

async function estimate(action: 'food.estimatePhoto' | 'food.estimateText', input: object): Promise<EstimateResult> {
  try {
    return await rpc<EstimateResult>(action, input);
  } catch (e) {
    return { error: failureCode(e) };
  }
}

export const estimatePhoto = (input: { photo: string; note?: string }) => estimate('food.estimatePhoto', input);
export const estimateText = (input: { description: string }) => estimate('food.estimateText', input);

/** Guarda un producto en la biblioteca compartida. */
export async function createFood(input: Parameters<Actions['createCustomFood']>[0]): Promise<{ id: string } | { error: string }> {
  try {
    const result = await rpc<Awaited<ReturnType<Actions['createCustomFood']>>>('food.create', input);
    if (!result.ok || !result.data) return { error: result.error ?? 'server' };
    // Para que el producto quede en la biblioteca del teléfono.
    serverChanged();
    return { id: result.data.id };
  } catch (e) {
    return { error: failureCode(e) };
  }
}
