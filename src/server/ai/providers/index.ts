import 'server-only';
import type { AiProvider } from './types';
import { anthropicProvider } from './anthropic';
import { geminiProvider } from './gemini';

/**
 * Registro de proveedores. Agregar otro es implementar `AiProvider` y sumarlo
 * acá. El proveedor activo se elige con `AI_PROVIDER` (ver `../config.ts`).
 */
const PROVIDERS: Record<string, AiProvider> = {
  anthropic: anthropicProvider,
  gemini: geminiProvider,
};

export function getProvider(name: string): AiProvider {
  const p = PROVIDERS[name];
  if (!p) throw new Error(`[ai] proveedor desconocido: ${name}`);
  return p;
}

export function aiIsConfigured(): boolean {
  return Object.values(PROVIDERS).some((p) => p.isConfigured());
}

export type { AiProvider } from './types';
