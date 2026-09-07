import 'server-only';
import { GoogleGenAI } from '@google/genai';
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
  effort?: AiGenerateRequest['effort'];
}): { thinkingBudget: number } | undefined {
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

/**
 * Un intento con casi todo el presupuesto; si falla por 503 ("high demand"),
 * un reintento corto con lo que quede. Gemini está teniendo picos de latencia y
 * de 503 en los modelos flash, así que los timeouts que llaman acá son amplios.
 */
async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  totalMs: number,
): Promise<T> {
  const deadline = Date.now() + totalMs;
  try {
    return await once(fn, Math.floor(totalMs * 0.8));
  } catch (e) {
    const msg = e instanceof Error ? `${e.name} ${e.message}` : String(e);
    const remaining = deadline - Date.now();
    if (!/(503|UNAVAILABLE|high demand|overloaded|500)/i.test(msg) || remaining < 4_000) throw e;
    await new Promise((r) => setTimeout(r, 800));
    return once(fn, remaining - 800);
  }
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
        (signal) =>
          ai.models.generateContent({
            model: req.model,
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

    try {
      const think = thinkingConfig(req);
      const res = await withRetry(
        (signal) =>
          ai.models.generateContent({
            model: req.model,
            contents: toGeminiContents(req.messages),
            config: {
              systemInstruction: system,
              temperature: req.temperature,
              maxOutputTokens: req.maxOutputTokens,
              responseMimeType: 'application/json',
              abortSignal: signal,
              ...(think ? { thinkingConfig: think } : {}),
            },
          }),
        req.timeoutMs,
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
