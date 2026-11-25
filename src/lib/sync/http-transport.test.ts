import { describe, expect, it } from 'vitest';
import { AuthError, SyncEngine } from './engine';
import { httpTransport } from './http-transport';
import { memoryStore } from './store';

const TOKEN = 'token-de-prueba';

function responding(status: number, body: unknown, seen: Array<{ url: string; init: RequestInit }> = []) {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(url), init: init! });
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  }) as typeof fetch;
}

const make = (fetchImpl: typeof fetch, token: string | null = TOKEN) =>
  httpTransport({ baseUrl: 'https://servidor.test/', getToken: async () => token, fetchImpl });

const op = { id: '00000000-0000-4000-8000-000000000001', type: 'weight.log', payload: { kg: 1 }, createdAt: '2026-11-25T10:00:00.000Z' };

describe('httpTransport', () => {
  it('manda los cambios con la sesión, sin cookies', async () => {
    const seen: Array<{ url: string; init: RequestInit }> = [];
    const res = await make(responding(200, { results: [{ id: op.id, status: 'applied' }] }, seen)).push([op]);
    expect(res.results).toEqual([{ id: op.id, status: 'applied' }]);
    expect(seen[0]!.url).toBe('https://servidor.test/api/mobile/v1/sync');
    expect(seen[0]!.init.credentials).toBe('omit');
    expect((seen[0]!.init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(String(seen[0]!.init.body))).toEqual({ protocol: 1, operations: [op] });
  });

  it('sin sesión o con sesión vencida avisa que hay que volver a entrar', async () => {
    await expect(make(responding(200, {}), null).push([op])).rejects.toThrow(AuthError);
    await expect(make(responding(401, {})).push([op])).rejects.toThrow(AuthError);
  });

  it('errores del servidor y respuestas raras no sacan nada de la cola', async () => {
    const bad = [
      responding(500, { error: 'SERVER' }),
      responding(503, {}),
      responding(200, '<html>Iniciá sesión en el wifi del hotel</html>'),
      responding(200, { ok: true }),
      responding(200, { results: [{ id: op.id, status: 'quien-sabe' }] }),
      (async () => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch,
    ];
    for (const fetchImpl of bad) {
      const engine = new SyncEngine({ userId: 'ana', store: memoryStore(), transport: make(fetchImpl) });
      await engine.enqueue('weight.log', { kg: 1 });
      expect((await engine.sync()).status).toBe('offline');
      expect(engine.getState().outbox).toHaveLength(1);
    }
  });
});
