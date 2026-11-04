import 'server-only';
import { DateTime } from 'luxon';
import { localTodayISO } from '@/lib/date';
import { prisma } from './db';
import { activeProvider, modelFor } from './ai/config';
import { maxOutputTokensFor } from './ai/config';
import { checkinFeedbackSystemPrompt, trainerAssistantSystemPrompt } from './ai/prompts/fitai';
import { generateWorkoutPlanDraft } from './ai/gateway';
import { recordUsage } from './ai/usage';
import { AiError } from './ai/errors';
import { resolveExerciseId } from './training/resolve-exercise';
import { getClientDetail, listTrainerClients, trainerEditAccess, type ClientDetail } from './trainers';
import { getFollowUp } from './trainer-followup';
import { getClientExtras, type ClientExtras } from './trainer-client-extras';
import { forUser } from './user-db';
import { widenReps } from '@/features/coach/plan-schema';
import { GOAL_LABEL } from '@/features/trainer/copy';
import {
  ageFromBirthdate,
  computeTargets,
  defaultWeeklyRateKg,
  nutritionTargetRationale,
} from '@/lib/nutrition/targets';

/**
 * IA del entrenador: un asistente para preguntar por sus clientes, borradores de rutina para un
 * cliente y sugerencias de objetivos de dieta. El uso se anota a nombre del entrenador y tiene
 * topes diarios propios (durante el piloto la IA del entrenador no depende de ningún plan pago).
 * Sólo ve y arma cosas de clientes con vínculo activo (y permiso de edición para armar rutinas).
 */

/** Mensajes del asistente por día. */
export const MAX_ASSISTANT_PER_DAY = 40;
/** Borradores de rutina por día. */
export const MAX_DRAFTS_PER_DAY = 10;
const MAX_HISTORY = 10;

async function usedToday(userId: string, timezone: string, task: 'coach_chat' | 'generate_plan'): Promise<number> {
  const today = DateTime.now().setZone(timezone).toISODate()!;
  const agg = await prisma.aiUsageDaily.aggregate({
    where: { userId, day: new Date(`${today}T00:00:00.000Z`), task },
    _sum: { messageCount: true },
  });
  return agg._sum.messageCount ?? 0;
}

const isoDay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : 'nunca');

/** Resumen de un cliente en texto, para que la IA pueda hablar de él. */
/** Lo que el cliente cargó de sí mismo y su historial detallado, en texto para la IA del entrenador. */
function describeExtras(x: ClientExtras | null): string[] {
  if (!x) return [];
  const out: string[] = [];
  for (const s of x.facts) out.push(`${s.title}: ` + s.rows.map((r) => `${r.label} ${r.value}`).join('; '));
  if (x.coachingLines.length > 0) out.push('Cuestionario de coaching: ' + x.coachingLines.join(' | ').slice(0, 1500));
  if (x.sportLines.length > 0) out.push('Deportes: ' + x.sportLines.join(' | ').slice(0, 600));
  if (x.records.length > 0) out.push('Récords: ' + x.records.slice(0, 8).map((r) => `${r.exercise} ${r.value} ${r.unit} (${r.type})`).join('; '));
  if (x.workouts.length > 0) {
    out.push('Detalle de entrenamientos recientes:');
    for (const w of x.workouts.slice(0, 5)) {
      out.push(`  - ${w.date} ${w.name}: ` + w.exercises.map((e) => `${e.name} ${e.sets} series${e.best ? ` (mejor ${e.best})` : ''}`).join(', '));
    }
  }
  if (x.steps.length > 0) {
    const avg = Math.round(x.steps.reduce((a, b) => a + b.steps, 0) / x.steps.length);
    out.push(`Pasos: promedio ${avg}/día en los últimos ${x.steps.length} días registrados.`);
  }
  return out;
}

function describeClient(d: ClientDetail, notes: string[], extras: ClientExtras | null = null): string {
  const lines: string[] = [];
  const b = d.basics;
  lines.push(`CLIENTE: ${d.name} (estado: ${d.attention}, última actividad: ${isoDay(d.lastActivityISO)})`);
  lines.push(
    `Perfil: objetivo ${b.goal ? (GOAL_LABEL[b.goal] ?? b.goal) : '—'}, ${b.sex ?? '—'}, ${b.ageYears ?? '—'} años, ` +
      `${b.heightCm ?? '—'} cm, experiencia ${b.experience ?? '—'}, ${b.daysAvailable ?? '—'} días/sem, ${b.sessionMinutes ?? '—'} min/sesión.`,
  );
  if (b.injuries) lines.push(`Lesiones/limitaciones: ${b.injuries}`);
  if (d.goal) lines.push(`Meta de peso: ${d.goal.startWeightKg ?? '—'} → ${d.goal.targetWeightKg ?? '—'} kg (${d.goal.weeklyRateKg ?? '—'} kg/sem).`);
  if (d.target) lines.push(`Objetivo nutricional: ${d.target.kcal} kcal · P ${d.target.proteinG} · C ${d.target.carbsG} · G ${d.target.fatG}.`);
  if (d.weights.length > 0) {
    const last = d.weights.slice(-8).map((w) => `${isoDay(w.date)}: ${w.weightKg}`).join(' | ');
    lines.push(`Peso (últimos registros): ${last}`);
  }
  if (d.workouts.length > 0) {
    lines.push('Últimos entrenamientos: ' + d.workouts.slice(0, 6).map((w) => `${w.name} (${isoDay(w.finishedAt)}${w.minutes ? `, ${w.minutes} min` : ''})`).join('; '));
  } else lines.push('Todavía no completó entrenamientos.');
  if (d.nutritionDays.length > 0) {
    lines.push('Comidas (últimos días): ' + d.nutritionDays.map((n) => `${isoDay(n.date)}: ${n.kcal} kcal, P ${n.proteinG} g`).join(' | '));
  } else lines.push('No cargó comidas en los últimos 7 días.');
  if (d.plan) {
    lines.push(`Rutina actual "${d.plan.name}":`);
    for (const day of d.plan.days) {
      lines.push(`  - ${day.name}: ${day.exercises.map((e) => `${e.name} ${e.sets}x${e.reps}`).join(', ')}`);
    }
  } else lines.push('No tiene rutina activa.');
  for (const c of d.checkins.slice(0, 3)) {
    lines.push(`Revisión semana del ${isoDay(c.weekStart)}: ${(c.summary ?? 'sin resumen').slice(0, 500)}`);
  }
  if (d.memories.length > 0) lines.push('Lo que el coach recuerda: ' + d.memories.map((m) => `[${m.category}] ${m.content}`).join('; '));
  if (notes.length > 0) lines.push('Notas privadas del entrenador: ' + notes.slice(0, 6).map((n) => n.slice(0, 200)).join(' | '));
  lines.push(...describeExtras(extras));
  return lines.join('\n');
}

export type AssistantResult =
  | { ok: true; text: string }
  | { error: 'LIMIT' | 'NO_CLIENT' | 'AI_ERROR'; detail?: string };

/** Respuesta del asistente. Con `clientId` conoce a fondo a ese cliente; sin él, el resumen de todos. */
export async function trainerAssistantReply(args: {
  trainerId: string;
  trainerName: string;
  timezone: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage: string;
  clientId: string | null;
}): Promise<AssistantResult> {
  const { trainerId, trainerName, timezone, history, userMessage, clientId } = args;
  if ((await usedToday(trainerId, timezone, 'coach_chat')) >= MAX_ASSISTANT_PER_DAY) return { error: 'LIMIT' };

  // Contexto: todos los clientes (resumen) y, si eligió uno, su ficha completa.
  const rows = await listTrainerClients(trainerId, timezone);
  const context: string[] = [`Fecha de hoy: ${localTodayISO(timezone)}`, '', `Clientes del entrenador (${rows.length}):`];
  for (const r of rows) {
    context.push(
      `- ${r.name} [${r.attention}] objetivo ${r.goal ? (GOAL_LABEL[r.goal] ?? r.goal) : '—'}, última actividad ${isoDay(r.lastActivityISO)}` +
        (r.weightKg != null ? `, peso ${r.weightKg} kg${r.weightChange30Kg != null ? ` (${r.weightChange30Kg > 0 ? '+' : ''}${r.weightChange30Kg} kg en 30 días)` : ''}` : ''),
    );
  }
  if (clientId) {
    const detail = await getClientDetail(trainerId, clientId, timezone);
    if (!detail) return { error: 'NO_CLIENT' };
    const follow = await getFollowUp(trainerId, clientId);
    const extras = await getClientExtras(trainerId, clientId, timezone);
    context.push('', 'FICHA DEL CLIENTE ELEGIDO:', describeClient(detail, follow?.notes.map((n) => n.body) ?? [], extras));
  }

  const model = modelFor('coach_chat');
  try {
    const res = await activeProvider().generate({
      model,
      system: trainerAssistantSystemPrompt(trainerName, context.join('\n')),
      messages: [...history.slice(-MAX_HISTORY), { role: 'user', content: userMessage }],
      maxOutputTokens: maxOutputTokensFor('coach_chat') + 600,
      timeoutMs: 60_000,
      temperature: 0.5,
      thinking: false,
    });
    const text = res.text.trim();
    await recordUsage(trainerId, 'coach_chat', model, res.usage, timezone, !!text);
    if (!text) return { error: 'AI_ERROR', detail: 'respuesta vacía' };
    return { ok: true, text };
  } catch (e) {
    console.error('[trainer-ai] asistente falló', e instanceof Error ? e.message : e);
    if (e instanceof AiError) return { error: 'AI_ERROR', detail: `${e.code}: ${e.message}`.slice(0, 160) };
    return { error: 'AI_ERROR', detail: e instanceof Error ? e.message.slice(0, 160) : 'desconocido' };
  }
}

export type FeedbackDraftResult =
  | { ok: true; text: string }
  | { error: 'LIMIT' | 'NO_CLIENT' | 'NOT_FOUND' | 'AI_ERROR'; detail?: string };

/**
 * Borrador del feedback a una revisión semanal. La IA redacta; el entrenador corrige y envía. Cuenta
 * contra el tope de mensajes de IA del entrenador.
 */
export async function draftCheckinFeedback(args: {
  trainerId: string;
  trainerName: string;
  clientId: string;
  checkinId: string;
  timezone: string;
}): Promise<FeedbackDraftResult> {
  const { trainerId, trainerName, clientId, checkinId, timezone } = args;
  if ((await usedToday(trainerId, timezone, 'coach_chat')) >= MAX_ASSISTANT_PER_DAY) return { error: 'LIMIT' };

  const detail = await getClientDetail(trainerId, clientId, timezone);
  if (!detail) return { error: 'NO_CLIENT' };
  const c = detail.checkins.find((x) => x.id === checkinId);
  if (!c) return { error: 'NOT_FOUND' };

  const follow = await getFollowUp(trainerId, clientId);
  const extras = await getClientExtras(trainerId, clientId, timezone);
  const first = detail.name.split(' ')[0] ?? detail.name;
  const lines = [
    describeClient(detail, follow?.notes.map((n) => n.body) ?? [], extras),
    '',
    `REVISIÓN A COMENTAR (semana del ${isoDay(c.weekStart)}; el cliente se llama ${first}):`,
    `Peso promedio: ${c.stats.avgWeightKg ?? '—'} kg; cambio: ${c.stats.weightChangeKg ?? '—'} kg`,
    `Adherencia a calorías: ${c.stats.kcalAdherencePct ?? '—'}%; a proteína: ${c.stats.proteinAdherencePct ?? '—'}%`,
    `Entrenamientos: ${c.stats.workoutsCompleted} de ${c.stats.workoutsPlanned} planificados`,
    c.scores.length > 0 ? 'Cómo se sintió (1 a 5): ' + c.scores.map((s) => `${s.label} ${s.value}`).join(', ') : 'No completó las preguntas de cómo se sintió.',
    c.adherenceNote ? `Nota sobre la dieta: ${c.adherenceNote}` : '',
    c.notes ? `Notas del cliente: ${c.notes}` : '',
    c.photoUrls.length > 0 ? `Subió ${c.photoUrls.length} fotos (vos no las ves).` : 'No subió fotos.',
  ].filter((l) => l !== '');

  const model = modelFor('coach_chat');
  try {
    const res = await activeProvider().generate({
      model,
      system: checkinFeedbackSystemPrompt(trainerName),
      messages: [{ role: 'user', content: lines.join('\n') }],
      maxOutputTokens: 700,
      timeoutMs: 45_000,
      temperature: 0.6,
      thinking: false,
    });
    const text = res.text.trim().replace(/^["“]|["”]$/g, '');
    await recordUsage(trainerId, 'coach_chat', model, res.usage, timezone, !!text);
    if (!text) return { error: 'AI_ERROR', detail: 'respuesta vacía' };
    return { ok: true, text: text.slice(0, 850) };
  } catch (e) {
    console.error('[trainer-ai] borrador de feedback falló', e instanceof Error ? e.message : e);
    return { error: 'AI_ERROR', detail: e instanceof Error ? e.message.slice(0, 160) : 'desconocido' };
  }
}

export type DraftResult = { ok: true; planId: string } | { error: 'NO_EDIT_PERMISSION' | 'LIMIT' | 'AI_ERROR' | 'NOT_FOUND'; detail?: string };

/**
 * Arma con IA un borrador de rutina para un cliente y lo deja en su cuenta SIN activar, con el
 * nombre "Borrador: …". El entrenador lo revisa y lo ajusta en el editor antes de activarlo.
 */
export async function generateRoutineForClient(args: {
  trainerId: string;
  clientId: string;
  timezone: string;
  brief: string;
}): Promise<DraftResult> {
  const { trainerId, clientId, timezone, brief } = args;
  if (!(await trainerEditAccess(trainerId, clientId))) return { error: 'NO_EDIT_PERMISSION' };
  if ((await usedToday(trainerId, timezone, 'generate_plan')) >= MAX_DRAFTS_PER_DAY) return { error: 'LIMIT' };

  const profile = await prisma.profile.findUnique({ where: { id: clientId } });
  const entitlement = await prisma.entitlement.findUnique({ where: { userId: clientId }, select: { createdAt: true } });
  if (!profile || !entitlement) return { error: 'NOT_FOUND' };

  let draft;
  try {
    // El borrador usa todo el contexto del cliente (incluido su perfil de coaching), como en el plan COACH.
    const res = await generateWorkoutPlanDraft({
      profile,
      entitlement: { tier: 'COACH', createdAt: entitlement.createdAt },
      brief,
      forTrainer: { trainerId, timezone },
    });
    draft = res.draft;
  } catch (e) {
    console.error('[trainer-ai] borrador falló', e instanceof Error ? e.message : e);
    return { error: 'AI_ERROR', detail: e instanceof Error ? e.message.slice(0, 160) : 'desconocido' };
  }

  const trainer = await prisma.trainerProfile.findUnique({ where: { userId: trainerId }, select: { displayName: true } });
  const days = [];
  for (const [di, d] of draft.days.entries()) {
    const exercises = [];
    const seen = new Set<string>();
    for (const e of d.exercises) {
      const exerciseId = await resolveExerciseId(e.name, clientId, e.type ?? 'STRENGTH');
      if (seen.has(exerciseId)) continue;
      seen.add(exerciseId);
      const { min, max } = widenReps(e.repsMin, e.repsMax, e.type);
      exercises.push({
        exerciseId,
        orderIndex: exercises.length,
        targetSets: e.sets,
        targetRepsMin: min,
        targetRepsMax: max,
        targetRir: e.rir,
        restSeconds: e.restSeconds,
        targetDurationSec: e.durationMinutes ? Math.round(e.durationMinutes * 60) : null,
        targetDistanceMeters: e.distanceKm ? Math.round(e.distanceKm * 1000) : null,
        notes: e.note?.trim() || null,
        rationale: e.rationale?.trim() || null,
      });
    }
    if (exercises.length > 0) days.push({ name: d.name, orderIndex: di, weekday: d.weekday, exercises: { create: exercises } });
  }
  if (days.length === 0) return { error: 'AI_ERROR', detail: 'el borrador no trajo ejercicios' };

  const plan = await forUser(clientId).workoutPlan.create({
    data: {
      userId: clientId,
      name: `Borrador: ${draft.name}`.slice(0, 60),
      description: `Borrador armado con IA para ${trainer?.displayName ?? 'tu entrenador'}. ${draft.description}`.slice(0, 300),
      source: 'MANUAL',
      isActive: false,
      days: { create: days },
    },
    select: { id: true },
  });
  return { ok: true, planId: plan.id };
}

export interface DietSuggestion {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  rationale: string;
}

/**
 * Objetivos de dieta sugeridos para un cliente (cálculo, no IA) a partir de su perfil, su peso y su
 * meta. Devuelve null si faltan datos. Sólo hace falta el vínculo activo.
 */
export async function suggestDietForClient(trainerId: string, clientId: string): Promise<DietSuggestion | null> {
  const link = await prisma.trainerClient.findFirst({
    where: { trainerId, clientId, status: 'ACTIVE', trainer: { status: 'ACTIVE' } },
    select: { id: true },
  });
  if (!link) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: clientId },
    select: { sex: true, birthdate: true, heightCm: true, activityLevel: true, primaryGoal: true },
  });
  if (!profile?.sex || !profile.birthdate || !profile.heightCm || !profile.activityLevel || !profile.primaryGoal) return null;

  const goal = await prisma.goal.findFirst({ where: { userId: clientId, status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
  const lastWeight = await prisma.weightEntry.findFirst({ where: { userId: clientId }, orderBy: { date: 'desc' }, select: { weightKg: true } });
  const weightKg = lastWeight?.weightKg ?? goal?.startWeightKg ?? null;
  if (!weightKg) return null;

  const rate = goal?.weeklyRateKg ?? defaultWeeklyRateKg(profile.primaryGoal);
  const r = computeTargets({
    sex: profile.sex,
    ageYears: ageFromBirthdate(profile.birthdate),
    heightCm: profile.heightCm,
    weightKg,
    activityLevel: profile.activityLevel,
    goal: profile.primaryGoal,
    weeklyRateKg: rate ?? defaultWeeklyRateKg(profile.primaryGoal),
  });
  return {
    kcal: r.kcal,
    proteinG: r.proteinG,
    carbsG: r.carbsG,
    fatG: r.fatG,
    rationale: nutritionTargetRationale(profile.primaryGoal, r.adjustmentPct, rate, r.proteinG),
  };
}
