import 'server-only';
import type { AiProvider } from './types';
import { anthropicProvider } from './anthropic';

/**
 * Registro de proveedores. El MVP usa sólo Anthropic; agregar otro es
 * implementar `AiProvider` y sumarlo acá.
 */
const PROVIDERS: Record<string, AiProvider> = {
  anthropic: anthropicProvider,
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
