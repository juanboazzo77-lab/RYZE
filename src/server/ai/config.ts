import 'server-only';
import { getProvider, type AiProvider } from './providers';

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

export function providerName(): string {
  return process.env.AI_PROVIDER?.trim() || DEFAULT_PROVIDER;
}

export function activeProvider(): AiProvider {
  return getProvider(providerName());
}

export function aiConfigured(): boolean {
  return activeProvider().isConfigured();
}

/** Modelo para cada tarea. `AI_MODEL` cubre las tareas "grandes"; `AI_MODEL_FAST` las livianas. */
export function modelFor(task: AiTask): string {
  const big = process.env.AI_MODEL?.trim() || DEFAULT_MODEL;
  const fast = process.env.AI_MODEL_FAST?.trim() || DEFAULT_MODEL_FAST;
  return task === 'parse' ? fast : big;
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
      return 8000;
    case 'weekly_checkin':
      // Con fotos + progresión de entrenamiento + el informe largo del plan
      // COACH, 1400 se quedaba corto y cortaba el JSON a mitad de respuesta.
      return 3000;
    case 'parse':
      return 700;
  }
}
