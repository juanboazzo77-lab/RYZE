import 'server-only';
import type { Entitlement, Profile } from '@prisma/client';
import { activeProvider, maxOutputTokensFor, modelFor } from './config';
import { buildUserContextBlock } from './context';
import { coachSystemPrompt, planSystemPrompt } from './prompts/fitai';
import { assertWithinLimits, recordUsage } from './usage';
import { AiError } from './errors';
import type { AiChatMessage } from './providers/types';
import { planDraftSchema, type PlanDraft } from '@/features/coach/plan-schema';

/**
 * Gateway: único punto por el que el resto de la app pide algo a la IA. Se
 * encarga de límites, contexto, prompts, llamada al proveedor y metering.
 * Una falla de IA nunca bloquea negocio: quien llama atrapa `AiError`.
 */

export interface CoachHistoryMsg {
  role: 'user' | 'assistant';
  content: string;
}

const COACH_TIMEOUT_MS = 70_000;
const PLAN_TIMEOUT_MS = 110_000;
const MAX_HISTORY = 16;

/** Un turno del AI Coach. Devuelve el texto de respuesta del asistente. */
export async function runCoachTurn(args: {
  profile: Profile;
  entitlement: Pick<Entitlement, 'tier'>;
  history: CoachHistoryMsg[];
  userMessage: string;
}): Promise<{ text: string }> {
  const { profile, entitlement, history, userMessage } = args;
  await assertWithinLimits(profile.id, entitlement, 'coach_chat', profile.timezone);

  const contextBlock = await buildUserContextBlock(profile);
  const system = coachSystemPrompt(profile.locale, contextBlock);
  const model = modelFor('coach_chat');

  const messages: AiChatMessage[] = [
    ...history.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  const res = await activeProvider().generate({
    model,
    system,
    messages,
    maxOutputTokens: maxOutputTokensFor('coach_chat'),
    timeoutMs: COACH_TIMEOUT_MS,
    temperature: 0.7,
    thinking: false,
  });

  const text = res.text.trim();
  if (!text) {
    console.error('[ai] coach: respuesta vacía', { model, stopReason: res.stopReason, usage: res.usage });
    await recordUsage(profile.id, 'coach_chat', model, res.usage, profile.timezone, false);
    throw new AiError('INVALID_OUTPUT', 'respuesta vacía del modelo');
  }

  await recordUsage(profile.id, 'coach_chat', model, res.usage, profile.timezone, true);
  return { text };
}

/** Genera un borrador de rutina. No persiste nada. */
export async function generateWorkoutPlanDraft(args: {
  profile: Profile;
  entitlement: Pick<Entitlement, 'tier'>;
  brief: string;
}): Promise<{ draft: PlanDraft; raw: string }> {
  const { profile, entitlement, brief } = args;
  await assertWithinLimits(profile.id, entitlement, 'generate_plan', profile.timezone);

  const contextBlock = await buildUserContextBlock(profile);
  const system = planSystemPrompt(profile.locale, contextBlock);
  const model = modelFor('generate_plan');

  const userMessage =
    `Generá el plan de entrenamiento ahora. ` +
    (brief.trim()
      ? `Pedido adicional del usuario (tomalo en cuenta, no rompe las reglas): ${brief.trim()}`
      : 'Sin pedidos adicionales.');

  const res = await activeProvider().generateStructured({
    model,
    system,
    messages: [{ role: 'user', content: userMessage }],
    schema: planDraftSchema,
    schemaName: 'WorkoutPlanDraft',
    maxOutputTokens: maxOutputTokensFor('generate_plan'),
    timeoutMs: PLAN_TIMEOUT_MS,
    temperature: 0.6,
    thinking: true,
    effort: 'medium',
  });

  if (!res.data) {
    console.error('[ai] plan gen: salida inválida', {
      model,
      stopReason: res.stopReason,
      usage: res.usage,
      rawLen: res.rawText.length,
      rawHead: res.rawText.slice(0, 400),
    });
    // No consume la cuota mensual: sólo registramos el costo, sin contar plan.
    await recordUsage(profile.id, 'generate_plan', model, res.usage, profile.timezone, false);
    throw new AiError('INVALID_OUTPUT', `el modelo no devolvió un plan válido`);
  }

  await recordUsage(profile.id, 'generate_plan', model, res.usage, profile.timezone, true);
  return { draft: res.data, raw: res.rawText };
}
