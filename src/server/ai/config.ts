import 'server-only';
import { getProvider, type AiProvider } from './providers';
import { withProviderFallback } from './providers/fallback';

/**
 * Configuración del núcleo de IA: qué proveedor y qué modelo usa cada tarea.
 * Todo se lee de env con defaults sensatos para Gemini.
 */

export type AiTask = 'coach_chat' | 'generate_plan' | 'weekly_checkin' | 'parse';

const DEFAULT_PROVIDER = 'gemini';
// `flash-lite` es rápido, barato y suficiente para coach y planes. Pinneado a
// una versión concreta porque el alias `-latest` a veces enruta a backends
// trabados. Subí a `gemini-flash-latest` en AI_MODEL para más calidad.
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_MODEL_FAST = 'gemini-3.5-flash-lite';
// Con Anthropic: Sonnet 5.5 para planes/chat/fotos y Haiku 5.5 para tareas livianas.
const ANTHROPIC_MODEL = 'claude-sonnet-5-5';
const ANTHROPIC_MODEL_FAST = 'claude-haiku-5-5';

export function providerName(): string {
  return process.env.AI_PROVIDER?.trim() || DEFAULT_PROVIDER;
}

/**
 * Un nombre de modelo de una variable de entorno sólo vale si es de la familia del
 * proveedor activo. Si quedó, por ejemplo, AI_MODEL="gemini-..." de cuando se usaba
 * Gemini y ahora el proveedor es Anthropic, se ignora y se usa el default en vez de
 * mandarle a Anthropic un modelo que no existe (eso rompía toda la IA).
 */
function modelFromEnv(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  const family = providerName() === 'anthropic' ? /^claude-/ : /^gemini-/;
  return family.test(v) ? v : undefined;
}

/**
 * Proveedor activo. Si el otro proveedor también tiene clave, queda de respaldo: si el
 * principal falla (sin crédito, caída, saturación) se reintenta con el otro.
 */
export function activeProvider(): AiProvider {
  const name = providerName();
  const primary = getProvider(name);
  const otherName = name === 'anthropic' ? 'gemini' : 'anthropic';
  const backup = getProvider(otherName);
  if (!backup.isConfigured()) return primary;
  return withProviderFallback(primary, backup, otherName === 'gemini' ? 'gemini-3.5-flash' : 'claude-sonnet-5-5');
}

export function aiConfigured(): boolean {
  return activeProvider().isConfigured();
}

/** Modelo para cada tarea. `AI_MODEL` cubre las tareas "grandes"; `AI_MODEL_FAST` las livianas. */
export function modelFor(task: AiTask): string {
  const anthropic = providerName() === 'anthropic';
  const big = modelFromEnv(process.env.AI_MODEL) || (anthropic ? ANTHROPIC_MODEL : DEFAULT_MODEL);
  const fast =
    modelFromEnv(process.env.AI_MODEL_FAST) || (anthropic ? ANTHROPIC_MODEL_FAST : DEFAULT_MODEL_FAST);
  // El chat del coach va con el modelo liviano (mucho más barato); planes y revisiones con el grande.
  return task === 'parse' || task === 'coach_chat' ? fast : big;
}

/** Modelo para análisis de fotos: pide mejor visión que el modelo liviano. */
export function visionModel(): string {
  const set = modelFromEnv(process.env.AI_VISION_MODEL);
  if (set) return set;
  return providerName() === 'anthropic' ? ANTHROPIC_MODEL : 'gemini-3.5-flash';
}

/** Presupuesto de tokens de salida por tarea. */
export function maxOutputTokensFor(task: AiTask): number {
  switch (task) {
    case 'coach_chat':
      return 1200;
    case 'generate_plan':
      // Un plan de 4-7 días con 4-7 ejercicios/día, cada uno con nombre, tipo,
      // sets/reps/RIR/descanso, note y rationale, ocupa bastante JSON — con
      // 4000 el modelo cortaba a mitad de respuesta (stopReason max_tokens)
      // en planes normales, no sólo en los más largos.
      // Con razonamiento activo parte del presupuesto se va en pensar: 16000 deja lugar al JSON completo.
      return 16000;
    case 'weekly_checkin':
      // Con fotos + progresión de entrenamiento + el informe largo del plan
      // COACH, 1400 se quedaba corto y cortaba el JSON a mitad de respuesta.
      return 3000;
    case 'parse':
      return 700;
  }
}
