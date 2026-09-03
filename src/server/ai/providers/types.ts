/**
 * Abstracción de proveedor de IA. El resto de la app NO depende de ningún SDK:
 * habla siempre con esta interfaz a través del Gateway.
 *
 * MVP: única implementación = Anthropic (`./anthropic.ts`).
 */
import type { z } from 'zod';

export type AiRole = 'user' | 'assistant';

/** Un bloque de contenido de entrada: texto o imagen. */
export type AiContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: string; dataBase64: string };

export interface AiChatMessage {
  role: AiRole;
  content: string | AiContentBlock[];
  assistantToolUses?: AiToolUse[];
  toolResults?: Array<{ toolUseId: string; content: string; isError?: boolean }>;
}

/** Definición de herramienta que se le ofrece al modelo (schema en JSON Schema). */
export interface AiToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface AiToolUse {
  id: string;
  name: string;
  input: unknown;
}

export interface AiUsageRaw {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface AiGenerateRequest {
  model: string;
  /** Prompt de sistema ya compuesto (guardrails + task). Se cachea. */
  system: string;
  messages: AiChatMessage[];
  maxOutputTokens: number;
  timeoutMs: number;
  temperature?: number;
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  /** Habilita razonamiento adaptativo (sólo modelos que lo soportan). */
  thinking?: boolean;
  tools?: AiToolSpec[];
  /** Instrucción de operador para este turno (canal system mid-conversación). */
  operatorNote?: string;
}

export interface AiGenerateResult {
  text: string;
  toolUses: AiToolUse[];
  /** 'end_turn' | 'tool_use' | 'max_tokens' | 'pause_turn' | 'refusal' */
  stopReason: string;
  usage: AiUsageRaw;
}

export interface AiStructuredRequest<T> extends Omit<AiGenerateRequest, 'tools' | 'operatorNote'> {
  schema: z.ZodType<T>;
  schemaName: string;
}

export interface AiStructuredResult<T> {
  data: T | null;
  rawText: string;
  usage: AiUsageRaw;
  stopReason: string;
}

export interface AiProvider {
  readonly name: string;
  /** true si el proveedor tiene credenciales y puede operar. */
  isConfigured(): boolean;
  generate(req: AiGenerateRequest): Promise<AiGenerateResult>;
  generateStructured<T>(req: AiStructuredRequest<T>): Promise<AiStructuredResult<T>>;
}
