import { z } from 'zod';
import { AuthError, type Transport } from './engine';
import { PROTOCOL_VERSION, type PushResponse, type Snapshot } from './protocol';

const pushResponseSchema = z.object({
  results: z.array(
    z.discriminatedUnion('status', [
      z.object({ id: z.string(), status: z.literal('applied') }),
      z.object({ id: z.string(), status: z.literal('duplicate') }),
      z.object({ id: z.string(), status: z.literal('rejected'), reason: z.string() }),
    ]),
  ),
});

const snapshotSchema = z.object({ protocol: z.number(), takenAt: z.string(), data: z.record(z.unknown()) });

export interface HttpTransportOptions {
  /** Dirección del servidor, p. ej. "https://www.forzaai.app". */
  baseUrl: string;
  /** La sesión vigente, o null si no hay (hay que volver a iniciar sesión). */
  getToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
  /** Con señal muy mala un pedido puede quedar colgado: se corta y se reintenta después. */
  timeoutMs?: number;
}

/** Cómo la app habla con el servidor. Cualquier respuesta rara cuenta como "no se pudo": no se pierde nada. */
export function httpTransport({ baseUrl, getToken, fetchImpl, timeoutMs = 20_000 }: HttpTransportOptions): Transport {
  async function call(path: string, body?: unknown): Promise<unknown> {
    const token = await getToken();
    if (!token) throw new AuthError();
    const doFetch = fetchImpl ?? fetch;
    const res = await doFetch(`${baseUrl.replace(/\/$/, '')}/api/mobile/v1/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      credentials: 'omit',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status === 401) throw new AuthError();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Una red con página de acceso (aeropuerto, hotel) responde 200 con otra cosa: la validación lo descarta.
    return res.json();
  }

  return {
    async push(operations): Promise<PushResponse> {
      return pushResponseSchema.parse(await call('sync', { protocol: PROTOCOL_VERSION, operations }));
    },
    async pull(): Promise<Snapshot> {
      return snapshotSchema.parse(await call('snapshot'));
    },
  };
}
