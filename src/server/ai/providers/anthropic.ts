import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
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
 * Implementación del proveedor sobre `@anthropic-ai/sdk`. Es el ÚNICO archivo
 * del repo que importa el SDK de Anthropic. Todo lo demás pasa por el Gateway.
 */

const MODELS_WITH_ADAPTIVE_THINKING = new Set(['claude-opus-5', 'claude-sonnet-5']);
const MODELS_WITH_MID_CONVO_SYSTEM = new Set(['claude-opus-5']);

let client: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiError('NOT_CONFIGURED', 'ANTHROPIC_API_KEY ausente');
  if (!client) client = new Anthropic({ apiKey, maxRetries: 2 });
  return client;
}

function extractUsage(usage: Anthropic.Usage | null | undefined): AiUsageRaw {
  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    cacheReadTokens: usage?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage?.cache_creation_input_tokens ?? 0,
  };
}

function toAnthropicMessages(messages: AiChatMessage[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  for (const msg of messages) {
    if (msg.toolResults && msg.toolResults.length > 0) {
      out.push({
        role: 'user',
        content: msg.toolResults.map((tr) => ({
          type: 'tool_result' as const,
          tool_use_id: tr.toolUseId,
          content: tr.content,
          is_error: tr.isError ?? false,
        })),
      });
      continue;
    }
    const blocks: Anthropic.ContentBlockParam[] = [];
    if (typeof msg.content === 'string') {
      if (msg.content) blocks.push({ type: 'text', text: msg.content });
    } else {
      for (const b of msg.content) {
        blocks.push(
          b.type === 'text'
            ? { type: 'text', text: b.text }
            : {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: b.mediaType as Anthropic.Base64ImageSource['media_type'],
                  data: b.dataBase64,
                },
              },
        );
      }
    }
    if (msg.assistantToolUses && msg.assistantToolUses.length > 0) {
      for (const tu of msg.assistantToolUses) {
        blocks.push({
          type: 'tool_use',
          id: tu.id,
          name: tu.name,
          input: (tu.input ?? {}) as Record<string, unknown>,
        });
      }
    }
    if (blocks.length === 0) blocks.push({ type: 'text', text: '(sin contenido)' });
    out.push({ role: msg.role, content: blocks });
  }
  return out;
}

function mapError(e: unknown): AiError {
  if (e instanceof AiError) return e;
  if (e instanceof Anthropic.RateLimitError) return new AiError('RATE_LIMITED', e.message);
  if (e instanceof Anthropic.APIConnectionTimeoutError) return new AiError('TIMEOUT', e.message);
  if (e instanceof Anthropic.AuthenticationError) {
    return new AiError(
      'NOT_CONFIGURED',
      e.message,
      'La clave de IA es inválida. Revisá ANTHROPIC_API_KEY.',
    );
  }
  if (e instanceof Anthropic.APIError) {
    const msg = String(e.message ?? '');
    if (/credit balance is too low|billing|purchase credits/i.test(msg)) {
      return new AiError(
        'NOT_CONFIGURED',
        `Anthropic: ${msg}`,
        'No hay crédito de IA disponible.',
      );
    }
    if (e instanceof Anthropic.BadRequestError) return new AiError('BAD_REQUEST', msg);
    return new AiError('PROVIDER_ERROR', `API ${e.status}: ${msg}`);
  }
  return new AiError('PROVIDER_ERROR', e instanceof Error ? e.message : 'Error del proveedor');
}

function buildThinking(
  model: string,
  req: { thinking?: boolean; effort?: AiGenerateRequest['effort'] },
) {
  if (!req.thinking || !MODELS_WITH_ADAPTIVE_THINKING.has(model)) {
    return { thinking: undefined, effort: undefined };
  }
  return { thinking: { type: 'adaptive' as const }, effort: req.effort ?? 'medium' };
}

export const anthropicProvider: AiProvider = {
  name: 'anthropic',

  isConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },

  async generate(req: AiGenerateRequest): Promise<AiGenerateResult> {
    const c = getClient();
    const messages = toAnthropicMessages(req.messages);
    const { thinking, effort } = buildThinking(req.model, req);

    let system = req.system;
    if (req.operatorNote) {
      if (MODELS_WITH_MID_CONVO_SYSTEM.has(req.model)) {
        messages.push({
          role: 'system' as unknown as 'user',
          content: req.operatorNote,
        } as Anthropic.MessageParam);
      } else {
        system = `${system}\n\n[Instrucción de operador para este turno]\n${req.operatorNote}`;
      }
    }

    try {
      const res = await c.messages.create(
        {
          model: req.model,
          max_tokens: req.maxOutputTokens,
          temperature: req.temperature,
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          messages,
          ...(req.tools && req.tools.length > 0
            ? {
                tools: req.tools.map((t) => ({
                  name: t.name,
                  description: t.description,
                  input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
                })),
              }
            : {}),
          ...(thinking ? { thinking } : {}),
          ...(effort ? { output_config: { effort } } : {}),
        },
        { timeout: req.timeoutMs },
      );

      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();

      const toolUses = res.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
        .map((b) => ({ id: b.id, name: b.name, input: b.input }));

      return {
        text,
        toolUses,
        stopReason: res.stop_reason ?? 'end_turn',
        usage: extractUsage(res.usage),
      };
    } catch (e) {
      throw mapError(e);
    }
  },

  async generateStructured<T>(req: AiStructuredRequest<T>): Promise<AiStructuredResult<T>> {
    const c = getClient();
    const jsonSchema = zodToJsonSchema(req.schema, {
      target: 'jsonSchema7',
      $refStrategy: 'none',
    }) as Record<string, unknown>;
    const { thinking, effort } = buildThinking(req.model, req);
    try {
      const res = await c.messages.create(
        {
          model: req.model,
          max_tokens: req.maxOutputTokens,
          temperature: req.temperature,
          system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
          messages: toAnthropicMessages(req.messages),
          output_config: {
            format: { type: 'json_schema', schema: jsonSchema },
            ...(effort ? { effort } : {}),
          },
          ...(thinking ? { thinking } : {}),
        },
        { timeout: req.timeoutMs },
      );

      const rawText = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();

      let data: T | null = null;
      try {
        const parsed: unknown = JSON.parse(rawText);
        const check = req.schema.safeParse(parsed);
        data = check.success ? check.data : null;
      } catch {
        data = null;
      }

      return {
        data,
        rawText,
        usage: extractUsage(res.usage),
        stopReason: res.stop_reason ?? 'end_turn',
      };
    } catch (e) {
      throw mapError(e);
    }
  },
};
