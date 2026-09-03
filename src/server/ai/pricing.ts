/**
 * Precios de los modelos de IA (USD por 1M de tokens) y cálculo de costo.
 *
 * Única fuente de verdad para estimar cuánto sale cada llamada. Se usa para el
 * metering (`ai_usage_daily`) y para el chequeo de límite ANTES de llamar al
 * modelo. Actualizable sin tocar el resto del sistema.
 */

export interface ModelPricing {
  inputPerMTok: number;
  outputPerMTok: number;
  cacheWriteMult: number;
  cacheReadMult: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-opus-5': { inputPerMTok: 5, outputPerMTok: 25, cacheWriteMult: 1.25, cacheReadMult: 0.1 },
  'claude-sonnet-5': { inputPerMTok: 2, outputPerMTok: 10, cacheWriteMult: 1.25, cacheReadMult: 0.1 },
  'claude-haiku-4-5': { inputPerMTok: 1, outputPerMTok: 5, cacheWriteMult: 1.25, cacheReadMult: 0.1 },
};

const FALLBACK_PRICING: ModelPricing = {
  inputPerMTok: 5,
  outputPerMTok: 25,
  cacheWriteMult: 1.25,
  cacheReadMult: 0.1,
};

export function pricingFor(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? FALLBACK_PRICING;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

/** Costo estimado en USD de una llamada, a partir de su uso de tokens. */
export function estimateCostUsd(model: string, usage: TokenUsage): number {
  const p = pricingFor(model);
  const m = 1_000_000;
  const cost =
    (usage.inputTokens / m) * p.inputPerMTok +
    (usage.outputTokens / m) * p.outputPerMTok +
    (usage.cacheReadTokens / m) * p.inputPerMTok * p.cacheReadMult +
    (usage.cacheWriteTokens / m) * p.inputPerMTok * p.cacheWriteMult;
  return Math.round(cost * 1e6) / 1e6;
}
