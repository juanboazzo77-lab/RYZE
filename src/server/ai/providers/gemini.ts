import 'server-only';
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';
import type {
  Content,
  FunctionDeclaration,
  GenerateContentResponse,
  Part,
} from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AiError } from '../errors';
import type {
  AiProvider,
  AiGenerateRequest,
  AiGenerateResult,
  AiStructuredRequest,
  AiStructuredResult,
  AiChatMessage,
  AiUsageRaw,
} from './types';

/**
 * Implementación del proveedor sobre `@google/genai` (Gemini API). Es el ÚNICO
 * archivo del repo que importa ese SDK; todo lo demás habla con `AiProvider`.
 *
 * Gemini no tiene "prompt caching" explícito como Anthropic: los tokens de
 * caché se reportan siempre en 0.
 */

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError('NOT_CONFIGURED', 'GEMINI_API_KEY ausente');
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

/** JSON Schema apto para Gemini: sin `$schema`/`$ref`/`additionalProperties`. */
function cleanSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(cleanSchema);
  if (schema && typeof schema === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
      if (k === '$schema' || k === '$ref' || k === 'additionalProperties' || k === 'default') continue;
      out[k] = cleanSchema(v);
    }
    return out;
  }
  return schema;
}


function toGeminiContents(messages: AiChatMessage[]): Content[] {
  const out: Content[] = [];
  for (const msg of messages) {
    if (msg.toolResults && msg.toolResults.length > 0) {
      out.push({
        role: 'user',
        parts: msg.toolResults.map((tr) => ({
          functionResponse: {
            id: tr.toolUseId,
            name: tr.toolUseId.split(':')[0] || 'tool',
            response: tr.isError
              ? { error: tr.content }
              : { output: tr.content },
          },
        })),
      });
      continue;
    }

    const parts: Part[] = [];
    if (typeof msg.content === 'string') {
      if (msg.content) parts.push({ text: msg.content });
    } else {
      for (const b of msg.content) {
        parts.push(
          b.type === 'text'
            ? { text: b.text }
            : { inlineData: { mimeType: b.mediaType, data: b.dataBase64 } },
        );
      }
    }
    if (msg.assistantToolUses && msg.assistantToolUses.length > 0) {
      for (const tu of msg.assistantToolUses) {
        parts.push({
          functionCall: {
            id: tu.id,
            name: tu.name,
            args: (tu.input ?? {}) as Record<string, unknown>,
          },
        });
      }
    }
    if (parts.length === 0) parts.push({ text: '(sin contenido)' });
    out.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts });
  }
  return out;
}

function extractUsage(res: GenerateContentResponse): AiUsageRaw {
  const u = res.usageMetadata;
  return {
    // promptTokenCount ya incluye tokens de contenido cacheado (si lo hubiera)
    inputTokens: u?.promptTokenCount ?? 0,
    // el "pensamiento" cuenta como tokens de salida facturables
    outputTokens: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0),
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };
}

function mapFinishReason(res: GenerateContentResponse): string {
  const fr = res.candidates?.[0]?.finishReason;
  if (res.functionCalls && res.functionCalls.length > 0) return 'tool_use';
  if (fr === 'MAX_TOKENS') return 'max_tokens';
  if (fr === 'SAFETY' || fr === 'PROHIBITED_CONTENT' || fr === 'BLOCKLIST') return 'refusal';
  return 'end_turn';
}

function mapError(e: unknown): AiError {
  if (e instanceof AiError) return e;
  const msg = e instanceof Error ? e.message : String(e);
  if (e instanceof Error && (e.name === 'AbortError' || e.name === 'AttemptTimeout')) {
    return new AiError('TIMEOUT', msg);
  }
  if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(msg)) {
    return new AiError('NOT_CONFIGURED', msg, 'La clave de IA es inválida. Revisá GEMINI_API_KEY.');
  }
  if (/RESOURCE_EXHAUSTED|quota|rate limit|429/i.test(msg)) {
    return new AiError(
      'RATE_LIMITED',
      msg,
      'Se alcanzó el límite de uso de la IA. Probá de nuevo en un rato.',
    );
  }
  if (/deadline|timeout|ETIMEDOUT/i.test(msg)) return new AiError('TIMEOUT', msg);
  if (/INVALID_ARGUMENT|400/i.test(msg)) return new AiError('BAD_REQUEST', msg);
  return new AiError('PROVIDER_ERROR', msg);
}

/**
 * `thinkingConfig` de Gemini. Los modelos 3.x rechazan `thinkingBudget: 0`
 * (no se puede desactivar el pensamiento), así que cuando no queremos gastar
 * en "thinking" devolvemos `undefined` y omitimos el campo por completo.
 */
function thinkingConfig(req: {
  thinking?: boolean;
  minimalThinking?: boolean;
  effort?: AiGenerateRequest['effort'];
}): { thinkingBudget: number } | { thinkingLevel: never } | undefined {
  if (req.minimalThinking) return { thinkingLevel: 'MINIMAL' as never };
  if (!req.thinking) return undefined;
  switch (req.effort) {
    case 'low':
      return { thinkingBudget: 512 };
    case 'high':
    case 'xhigh':
    case 'max':
      return { thinkingBudget: 4096 };
    default:
      return { thinkingBudget: 1536 };
  }
}

class AttemptTimeout extends Error {
  constructor() {
    super('attempt timed out');
    this.name = 'AttemptTimeout';
  }
}

/** Corre `fn(signal)` una vez con `budgetMs`; timeout DURO vía `Promise.race`
 * porque el SDK de Gemini a veces ignora el `abortSignal`. */
async function once<T>(fn: (signal: AbortSignal) => Promise<T>, budgetMs: number): Promise<T> {
  const ac = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(ac.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          ac.abort();
          reject(new AttemptTimeout());
        }, budgetMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Modelos de respaldo, en orden. Cada modelo tiene su propia cuota diaria. */
function fallbackChain(model: string): string[] {
  const second = process.env.AI_FALLBACK_MODEL?.trim() || 'gemini-3.5-flash';
  const third = process.env.AI_FALLBACK_MODEL_2?.trim() || 'gemini-3.8-flash';
  const lite = process.env.AI_MODEL?.trim() || 'gemini-3.5-flash-lite';
  return [...new Set([model, second, third, lite])];
}

const TRANSIENT = /(503|UNAVAILABLE|high demand|overloaded|500|timed out|AttemptTimeout)/i;
const QUOTA = /(RESOURCE_EXHAUSTED|exceeded your current quota|429|NOT_FOUND|is not found|404)/i;

/** Modelos con la cuota diaria agotada: se saltean hasta que se renueve. */
const exhaustedUntil = new Map<string, number>();

function markExhausted(model: string, message: string) {
  const m = /"retryDelay":"(\d+)s"/.exec(message);
  const seconds = m ? Number(m[1]) : 600;
  exhaustedUntil.set(model, Date.now() + Math.min(Math.max(seconds, 60), 6 * 3600) * 1000);
}

/**
 * Reintenta con el tiempo disponible, rotando entre el modelo principal y los de
 * respaldo. Gemini tiene picos de saturación (los 503 vuelven en segundos: se
 * reintenta enseguida), pedidos que se cuelgan (se cortan para probar con otro
 * modelo) y, en el plan gratuito, una cuota diaria chica por modelo (un modelo
 * agotado se saltea y se pasa al siguiente sin esperar).
 */
async function withRetry<T>(
  fn: (signal: AbortSignal, model: string) => Promise<T>,
  totalMs: number,
  model: string,
): Promise<T> {
  const chain = fallbackChain(model);
  const deadline = Date.now() + totalMs;
  const firstShare = totalMs <= 70_000 ? 0.4 : 0.55;
  let lastError: unknown;
  let turn = 0;

  for (let attempt = 0; attempt < 6; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < 4_000) break;
    const live = chain.filter((m) => (exhaustedUntil.get(m) ?? 0) < Date.now());
    if (live.length === 0) break;
    const next = live[turn % live.length] as string;
    const budget =
      turn === 0 && live.length > 1
        ? Math.floor(totalMs * firstShare)
        : turn === 1
          ? Math.floor(remaining * 0.6)
          : remaining;
    try {
      return await once((signal) => fn(signal, next), Math.min(budget, remaining));
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      if (QUOTA.test(msg)) {
        markExhausted(next, msg);
        continue; // otro modelo, sin esperar
      }
      if (!TRANSIENT.test(msg)) throw e;
      turn++;
      await new Promise((r) => setTimeout(r, turn < 2 ? 400 : 1_200));
    }
  }
  if (lastError) throw lastError;
  throw new Error('429 RESOURCE_EXHAUSTED: cuota diaria agotada en todos los modelos');
}

export const geminiProvider: AiProvider = {
  name: 'gemini',

  isConfigured() {
    return Boolean(process.env.GEMINI_API_KEY);
  },

  async generate(req: AiGenerateRequest): Promise<AiGenerateResult> {
    const ai = getClient();
    let system = req.system;
    if (req.operatorNote) {
      system = `${system}\n\n[Instrucción de operador para este turno]\n${req.operatorNote}`;
    }

    const tools =
      req.tools && req.tools.length > 0
        ? [
            {
              functionDeclarations: req.tools.map(
                (t): FunctionDeclaration => ({
                  name: t.name,
                  description: t.description,
                  parametersJsonSchema: cleanSchema(t.inputSchema),
                }),
              ),
            },
          ]
        : undefined;

    try {
      const think = thinkingConfig(req);
      const res = await withRetry(
        (signal, model) =>
          ai.models.generateContent({
            model,
            contents: toGeminiContents(req.messages),
            config: {
              systemInstruction: system,
              temperature: req.temperature,
              maxOutputTokens: req.maxOutputTokens,
              abortSignal: signal,
              ...(think ? { thinkingConfig: think } : {}),
              ...(tools ? { tools } : {}),
            },
          }),
        req.timeoutMs,
        req.model,
      );

      const toolUses = (res.functionCalls ?? []).map((fc, i) => ({
        id: `${fc.name ?? 'tool'}:${fc.id ?? i}`,
        name: fc.name ?? 'tool',
        input: fc.args ?? {},
      }));

      return {
        text: (res.text ?? '').trim(),
        toolUses,
        stopReason: mapFinishReason(res),
        usage: extractUsage(res),
      };
    } catch (e) {
      throw mapError(e);
    }
  },

  async generateStructured<T>(req: AiStructuredRequest<T>): Promise<AiStructuredResult<T>> {
    const ai = getClient();

    // `responseSchema` / `responseJsonSchema` de Gemini rechaza (400) esquemas
    // anidados con min/maxItems. Más robusto: `responseMimeType: json` + el JSON
    // Schema descrito en el prompt + validación con Zod de nuestro lado.
    const jsonSchema = cleanSchema(
      zodToJsonSchema(req.schema, { target: 'jsonSchema7', $refStrategy: 'none' }),
    );
    const system =
      `${req.system}\n\nRespondé EXCLUSIVAMENTE con un objeto JSON válido para este ` +
      `JSON Schema (sin markdown, sin comentarios, sin texto antes ni después):\n` +
      JSON.stringify(jsonSchema);

    const hasImages = req.messages.some(
      (m) => Array.isArray(m.content) && m.content.some((b) => b.type === 'image'),
    );

    try {
      const think = thinkingConfig(req);
      const res = await withRetry(
        (signal, model) =>
          ai.models.generateContent({
            model,
            contents: toGeminiContents(req.messages),
            config: {
              systemInstruction: system,
              temperature: req.temperature,
              maxOutputTokens: req.maxOutputTokens,
              responseMimeType: 'application/json',
              abortSignal: signal,
              ...(think ? { thinkingConfig: think } : {}),
              // Fotos del propio físico (torso sin remera): con el filtro por defecto
              // el modelo suele bloquearlas como "contenido explícito". Sólo se
              // relaja ese filtro y sólo cuando el pedido trae imágenes.
              ...(hasImages
                ? {
                    safetySettings: [
                      {
                        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                      },
                    ],
                  }
                : {}),
            },
          }),
        req.timeoutMs,
        req.model,
      );

      const rawText = (res.text ?? '').trim();
      const jsonText = rawText
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();

      let data: T | null = null;
      try {
        const check = req.schema.safeParse(JSON.parse(jsonText));
        data = check.success ? check.data : null;
        if (!check.success) {
          console.error(
            `[ai] ${req.schemaName}: no cumple el esquema`,
            check.error.issues
              .slice(0, 6)
              .map((i) => `${i.path.join('.')}: ${i.message}`),
          );
        }
      } catch {
        data = null;
      }

      return {
        data,
        rawText,
        usage: extractUsage(res),
        stopReason: mapFinishReason(res),
      };
    } catch (e) {
      throw mapError(e);
    }
  },
};
