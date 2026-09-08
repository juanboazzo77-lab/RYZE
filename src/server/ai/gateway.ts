import 'server-only';
import type { Entitlement, Locale, Profile } from '@prisma/client';
import { activeProvider, maxOutputTokensFor, modelFor } from './config';
import { buildUserContextBlock } from './context';
import {
  checkinSystemPrompt,
  coachSystemPrompt,
  exerciseGuideSystemPrompt,
  goalAdviceSystemPrompt,
  mealPlanSystemPrompt,
  planSystemPrompt,
} from './prompts/fitai';
import { assertWithinLimits, recordUsage } from './usage';
import { AiError } from './errors';
import type { AiChatMessage, AiContentBlock } from './providers/types';
import { planDraftSchema, type PlanDraft } from '@/features/coach/plan-schema';
import { checkinReviewSchema, type CheckinReview } from '@/features/checkin/schema';
import { goalAdviceSchema, type GoalAdvice } from '@/features/onboarding/goal-advice-schema';
import { mealPlanSchema, type MealPlan } from '@/features/nutrition/meal-plan-schema';
import { exerciseGuideSchema, type ExerciseGuideAi } from '@/features/training/exercise-guide-schema';

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
const CHECKIN_TIMEOUT_MS = 80_000;
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

/* ------------------------------------------------------------------ */
/* Guía de ejercicio                                                  */
/* ------------------------------------------------------------------ */

/** Genera cues de técnica + músculos secundarios de un ejercicio. Barato
 *  (modelo rápido, sin thinking). Quien llama lo cachea en `exercise`. */
export async function describeExercise(args: {
  userId: string;
  timezone: string;
  locale: Profile['locale'];
  name: string;
  primaryMuscle: string;
  equipment: string | null;
}): Promise<ExerciseGuideAi | null> {
  const { userId, timezone, locale, name, primaryMuscle, equipment } = args;
  const model = modelFor('parse');
  try {
    const res = await activeProvider().generateStructured({
      model,
      system: exerciseGuideSystemPrompt(locale),
      messages: [
        {
          role: 'user',
          content: `Ejercicio: ${name}. Músculo principal: ${primaryMuscle}.${
            equipment ? ` Equipo: ${equipment}.` : ''
          }`,
        },
      ],
      schema: exerciseGuideSchema,
      schemaName: 'ExerciseGuide',
      maxOutputTokens: maxOutputTokensFor('parse'),
      timeoutMs: 25_000,
      temperature: 0.3,
      thinking: false,
    });
    await recordUsage(userId, 'parse', model, res.usage, timezone, false);
    return res.data;
  } catch (e) {
    console.error('[ai] describeExercise falló', e instanceof Error ? e.message : e);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Planificación de comidas                                           */
/* ------------------------------------------------------------------ */

/**
 * Genera un día de comidas que apunta a los objetivos nutricionales del usuario
 * respetando sus preferencias/exclusiones. No persiste nada.
 */
export async function generateMealPlan(args: {
  profile: Profile;
  entitlement: Pick<Entitlement, 'tier'>;
  target: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  brief: string;
}): Promise<{ plan: MealPlan | null; raw: string }> {
  const { profile, target, brief } = args;
  const contextBlock = await buildUserContextBlock(profile);
  const model = modelFor('generate_plan');

  const system = mealPlanSystemPrompt(profile.locale, contextBlock, target, profile.mealsPerDay ?? 4);

  const userMessage =
    'Generá el día de comidas ahora.' +
    (brief.trim() ? ` Pedido del usuario (respetá las reglas): ${brief.trim()}` : ' Sin pedidos extra.');

  const res = await activeProvider().generateStructured({
    model,
    system,
    messages: [{ role: 'user', content: userMessage }],
    schema: mealPlanSchema,
    schemaName: 'MealPlan',
    maxOutputTokens: maxOutputTokensFor('generate_plan'),
    timeoutMs: PLAN_TIMEOUT_MS,
    temperature: 0.6,
    thinking: true,
    effort: 'low',
  });

  await recordUsage(profile.id, 'generate_plan', model, res.usage, profile.timezone, false);
  return { plan: res.data, raw: res.rawText };
}

/* ------------------------------------------------------------------ */
/* Recomendación de objetivo (onboarding "indeciso")                  */
/* ------------------------------------------------------------------ */

/**
 * Para un usuario que eligió objetivo "indeciso": recomienda un objetivo
 * concreto y qué mejorar, a partir de sus datos y (si mandó) sus fotos. Las
 * fotos son efímeras: no se persisten. Best-effort: nunca bloquea el onboarding.
 */
export async function recommendGoalFromPhotos(args: {
  userId: string;
  locale: Locale;
  timezone: string;
  profileFacts: string;
  photos: string[];
}): Promise<{ advice: GoalAdvice | null }> {
  const { userId, locale, timezone, profileFacts, photos } = args;
  const model = modelFor('weekly_checkin');

  const system = goalAdviceSystemPrompt(
    locale,
    `${profileFacts}\n\nFotos adjuntas: ${photos.length > 0 ? `${photos.length}` : 'ninguna'}.`,
  );

  const askText = 'Recomendá el objetivo y qué mejorar. Devolvé el JSON.';
  const userContent: AiContentBlock[] = [{ type: 'text', text: askText }];
  for (const p of photos) {
    const m = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/s.exec(p);
    if (m && m[1] && m[2]) userContent.push({ type: 'image', mediaType: m[1], dataBase64: m[2] });
  }

  try {
    const res = await activeProvider().generateStructured({
      model,
      system,
      messages: [{ role: 'user', content: userContent.length > 1 ? userContent : askText }],
      schema: goalAdviceSchema,
      schemaName: 'GoalAdvice',
      maxOutputTokens: maxOutputTokensFor('weekly_checkin'),
      timeoutMs: CHECKIN_TIMEOUT_MS,
      temperature: 0.4,
      thinking: true,
      effort: 'low',
    });
    await recordUsage(userId, 'weekly_checkin', model, res.usage, timezone, false);
    return { advice: res.data };
  } catch (e) {
    if (e instanceof AiError) console.error('[ai] goal advice', e.code, '-', e.message);
    else console.error('[ai] goal advice falló', e instanceof Error ? e.message : e);
    return { advice: null };
  }
}

/* ------------------------------------------------------------------ */
/* Revisión semanal                                                   */
/* ------------------------------------------------------------------ */

export interface CheckinWeekReport {
  weekStartISO: string;
  weightChangeKg: number | null;
  avgWeightKg: number | null;
  kcalAdherencePct: number | null;
  proteinAdherencePct: number | null;
  workoutsCompleted: number;
  workoutsPlanned: number;
  avgSteps: number | null;
}

export interface CheckinSubjective {
  hunger: number | null;
  energy: number | null;
  sleep: number | null;
  trainingFeel: number | null;
  dietAdherence: number | null;
  stress: number | null;
  outsideActivity: number | null;
  adherenceNote: string | null;
  notes: string | null;
}

export interface CheckinHistoryEntry {
  weekStartISO: string;
  weightChangeKg: number | null;
  kcalAdherencePct: number | null;
  /** Qué se decidió esa semana: 'none' | 'nutrition_targets(2200 kcal)' etc. */
  decision: string;
  applied: boolean;
}

function scale(n: number | null): string {
  if (n === null) return 's/d';
  return `${n}/5`;
}

/**
 * El AI Coach revisa la semana: resume qué pasó y decide si ajustar los
 * objetivos nutricionales, teniendo en cuenta los ajustes de semanas previas
 * (memoria) para no encadenar cambios. No persiste nada.
 */
export async function reviewWeeklyCheckin(args: {
  profile: Profile;
  entitlement: Pick<Entitlement, 'tier'>;
  week: CheckinWeekReport;
  subjective: CheckinSubjective;
  currentTarget: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null;
  history: CheckinHistoryEntry[];
  /**
   * Fotos de físico como data URLs (`data:image/...;base64,...`). Efímeras: se
   * mandan al modelo para el análisis y NO se persisten en ningún lado.
   */
  photos?: string[];
  /** Bloque de texto con el rendimiento de entrenamiento de la semana. */
  trainingBlock?: string | null;
}): Promise<{ review: CheckinReview | null }> {
  const { profile, week, subjective, currentTarget, history, photos = [], trainingBlock = null } = args;

  const baseContext = await buildUserContextBlock(profile);
  const model = modelFor('weekly_checkin');

  const historyBlock =
    history.length > 0
      ? history
          .map(
            (h) =>
              `  - Semana ${h.weekStartISO}: peso ${h.weightChangeKg ?? 's/d'} kg, ` +
              `adherencia kcal ${h.kcalAdherencePct ?? 's/d'}%. Decisión: ${h.decision}` +
              (h.applied ? ' (aplicada)' : ''),
          )
          .join('\n')
      : '  (sin revisiones previas)';

  const reportBlock = [
    `Semana en revisión: ${week.weekStartISO}`,
    `Entrenamientos: ${week.workoutsCompleted}/${week.workoutsPlanned}`,
    `Cambio de peso en la semana: ${week.weightChangeKg ?? 's/d'} kg (promedio ${week.avgWeightKg ?? 's/d'} kg)`,
    `Adherencia calorías: ${week.kcalAdherencePct ?? 's/d'}% de los días · proteína: ${week.proteinAdherencePct ?? 's/d'}%`,
    `Pasos promedio del día: ${week.avgSteps ?? 's/d'}${week.avgSteps !== null ? ' (dato objetivo de actividad/NEAT)' : ''}`,
    `Subjetivo (1-5): hambre ${scale(subjective.hunger)} (1 mucha–5 bajo control), ` +
      `energía ${scale(subjective.energy)} (1 mal–5 muy bien), sueño ${scale(subjective.sleep)} (1 mal–5 muy bien), ` +
      `sensación en entrenos ${scale(subjective.trainingFeel)} (1 mal–5 muy bien)`,
    `Autoevaluación (1-5): cumplimiento de la dieta ${scale(subjective.dietAdherence)} (1 nada–5 al 100%), ` +
      `estrés de la semana ${scale(subjective.stress)} (1 poco–5 mucho; alto = negativo para recuperación/adherencia), ` +
      `actividad fuera del gimnasio ${scale(subjective.outsideActivity)} (1 poca–5 mucha; baja = TDEE más bajo)`,
    subjective.adherenceNote ? `Dificultades: ${subjective.adherenceNote}` : null,
    subjective.notes ? `Notas: ${subjective.notes}` : null,
    currentTarget
      ? `Objetivo nutricional actual: ${currentTarget.kcal} kcal · P ${currentTarget.proteinG} · C ${currentTarget.carbsG} · G ${currentTarget.fatG}`
      : 'Sin objetivo nutricional activo.',
    photos.length > 0
      ? `El usuario adjuntó ${photos.length} foto(s) de físico. Analizalas y completá "physiqueNote" ` +
        `según su objetivo actual (${profile.primaryGoal ?? 's/d'}). Las fotos son efímeras: no se guardan.`
      : 'Sin fotos de físico esta semana (dejá "physiqueNote" en "").',
    '',
    trainingBlock
      ? `${trainingBlock}\n\nCompletá "training" (call + summary + adjustments por ejercicio).`
      : 'Sin datos de entrenamiento esta semana (omití "training").',
    '',
    'Historial de revisiones (memoria — respetalo):',
    historyBlock,
  ]
    .filter((l) => l !== null)
    .join('\n');

  const system = checkinSystemPrompt(profile.locale, `${baseContext}\n\n${reportBlock}`);

  const userContent: AiContentBlock[] = [
    { type: 'text', text: 'Revisá la semana y devolvé el JSON.' },
  ];
  for (const p of photos) {
    const m = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/s.exec(p);
    if (m && m[1] && m[2]) userContent.push({ type: 'image', mediaType: m[1], dataBase64: m[2] });
  }

  const res = await activeProvider().generateStructured({
    model,
    system,
    messages: [
      { role: 'user', content: userContent.length > 1 ? userContent : 'Revisá la semana y devolvé el JSON.' },
    ],
    schema: checkinReviewSchema,
    schemaName: 'WeeklyCheckinReview',
    maxOutputTokens: maxOutputTokensFor('weekly_checkin'),
    timeoutMs: CHECKIN_TIMEOUT_MS,
    temperature: 0.4,
    thinking: true,
    effort: 'low',
  });

  await recordUsage(profile.id, 'weekly_checkin', model, res.usage, profile.timezone, false);

  if (!res.data) {
    console.error('[ai] checkin review: salida inválida', {
      model,
      stopReason: res.stopReason,
      rawHead: res.rawText.slice(0, 300),
    });
    return { review: null };
  }
  return { review: res.data };
}
