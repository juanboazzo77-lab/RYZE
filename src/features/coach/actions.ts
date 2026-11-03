'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { DateTime } from 'luxon';
import type { MuscleGroup, PrimaryGoal } from '@prisma/client';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { prisma } from '@/server/db';
import { AiError, AiRateLimitedError, AiPermissionError, AiNotConfiguredError } from '@/server/ai/errors';
import { aiConfigured } from '@/server/ai/config';
import { runCoachTurn, generateWorkoutPlanDraft } from '@/server/ai/gateway';
import { localTodayISO } from '@/lib/date';
import {
  coachEditSchema,
  coachExerciseSchema,
  coachFoodSchema,
  coachUndoSchema,
  isApplicableCoachEdit,
  type CoachEdit,
  type CoachUndo,
  type CoachExercise,
  type CoachFood,
} from './reply-schema';
import {
  computeTargets,
  ageFromBirthdate,
  defaultWeeklyRateKg,
  nutritionTargetRationale,
} from '@/lib/nutrition/targets';
import { planDraftSchema, widenReps, type PlanDraft, type NutritionDraft } from './plan-schema';
import { STYLE_PROMPT } from './plan-styles';
import { normalizeName } from '@/lib/training/volume';
import {
  acceptPlanSchema,
  generatePlanSchema,
  sendMessageSchema,
  type AcceptPlanInput,
  type GeneratePlanInput,
  type SendMessageInput,
} from './schema';

export interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

function aiErrorMessage(e: unknown): string {
  if (e instanceof AiError) {
    console.error('[coach] AiError', e.code, '-', e.message);
    // Los errores con mensaje propio (límite, plan, sin crédito) se muestran tal cual; el resto
    // lleva el código y el motivo técnico, para poder diagnosticar desde lo que ve el usuario.
    const own = e instanceof AiRateLimitedError || e instanceof AiPermissionError || e instanceof AiNotConfiguredError;
    return own ? e.userMessage : `${e.userMessage} (${e.code}: ${e.message.slice(0, 140)})`;
  }
  console.error('[coach] error inesperado', e instanceof Error ? `${e.name}: ${e.message}` : e);
  const detail = e instanceof Error ? `${e.name}: ${e.message}`.replace(/\s+/g, ' ').slice(0, 140) : 'desconocido';
  return `No pudimos generar la respuesta ahora. Probá de nuevo en un rato. (${detail})`;
}

/* ------------------------------------------------------------------ */
/* AI Coach — chat                                                    */
/* ------------------------------------------------------------------ */

export async function sendCoachMessage(
  raw: SendMessageInput,
): Promise<
  Result<{
    reply: string;
    food: CoachFood | null;
    exercise: CoachExercise | null;
    edit: CoachEdit | null;
    /** El cambio ya se aplicó solo (el cliente tiene activado "aplicar automáticamente"). */
    editApplied: boolean;
    editError: string | null;
    editUndo: CoachUndo | null;
    planDays: Array<{ id: string; name: string }>;
  }>
> {
  const parsed = sendMessageSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  if (!aiConfigured()) return { error: 'La IA todavía no está configurada.' };

  const { userId, profile, entitlement } = await requireUser();
  const db = forUser(userId);

  const convo = await db.aiConversation.findFirst({
    where: { kind: 'COACH' },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      messages: { orderBy: { createdAt: 'asc' }, select: { role: true, content: true } },
    },
  });

  const history = (convo?.messages ?? []).map((m) => ({
    role: m.role === 'ASSISTANT' ? ('assistant' as const) : ('user' as const),
    content: m.content,
  }));

  let reply: string;
  let food: CoachFood | null = null;
  let exercise: CoachExercise | null = null;
  let edit: CoachEdit | null = null;
  try {
    const res = await runCoachTurn({
      profile,
      entitlement,
      history,
      userMessage: parsed.data.text,
    });
    reply = res.text;
    food = res.food;
    exercise = res.exercise;
    edit = res.edit;
  } catch (e) {
    return { error: aiErrorMessage(e) };
  }

  // Persistimos ambos turnos juntos sólo si la IA respondió bien.
  let conversationId = convo?.id;
  if (!conversationId) {
    const created = await db.aiConversation.create({
      data: { userId, kind: 'COACH' },
      select: { id: true },
    });
    conversationId = created.id;
  }
  await db.aiMessage.createMany({
    data: [
      { conversationId, role: 'USER', content: parsed.data.text },
      { conversationId, role: 'ASSISTANT', content: reply },
    ],
  });
  await db.aiConversation.updateMany({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  revalidatePath('/coach');
  // Si propone un ejercicio, se devuelven los días de la rutina activa para elegir dónde agregarlo.
  let planDays: Array<{ id: string; name: string }> = [];
  if (exercise) {
    const plan = await db.workoutPlan.findFirst({
      where: { isActive: true },
      select: { days: { orderBy: { orderIndex: 'asc' }, select: { id: true, name: true } } },
    });
    planDays = plan?.days ?? [];
  }

  // Si el cliente eligió aplicar los cambios solos, se aplica el pedido acá mismo.
  let editApplied = false;
  let editError: string | null = null;
  let editUndo: CoachUndo | null = null;
  if (edit && profile.coachAutoApply) {
    const done = await performCoachEdit(userId, edit).catch((err) => {
      console.error('[coach] no se pudo aplicar el cambio solo', err instanceof Error ? err.message : err);
      return { error: 'ERROR' } as Result<CoachEditDone>;
    });
    editApplied = !!done.ok;
    editUndo = done.data?.undo ?? null;
    editError = done.ok ? null : (done.error ?? 'ERROR');
  }

  return { ok: true, data: { reply, food, exercise, edit, editApplied, editError, editUndo, planDays } };
}

/** Lo que devuelve un cambio aplicado: cuántas filas tocó y cómo volver atrás. */
export interface CoachEditDone {
  changed: number;
  undo: CoachUndo;
}

/** Busca un ejercicio por nombre dentro de la rutina: exacto o, si no, uno contiene al otro. */
function sameExercise(planName: string, asked: string): boolean {
  const a = normalizeName(planName);
  const b = normalizeName(asked);
  if (!a || !b) return false;
  if (a === b) return true;
  const short = a.length < b.length ? a : b;
  return short.length >= 5 && (a.includes(b) || b.includes(a));
}

/**
 * Aplica el cambio que el usuario le pidió al coach y confirmó con el botón "Editar".
 * Toca sólo lo que dice el cambio, en la rutina activa o en los objetivos de nutrición.
 */
export async function applyCoachEdit(raw: CoachEdit): Promise<Result<CoachEditDone>> {
  const parsed = coachEditSchema.safeParse(raw);
  if (!parsed.success || !isApplicableCoachEdit(parsed.data)) return { error: 'INVALID' };
  const { userId } = await requireUser();
  return performCoachEdit(userId, parsed.data);
}

/** Elige si los cambios que pide el cliente se aplican solos (sin tocar "Editar"). */
export async function setCoachAutoApply(enabled: boolean): Promise<Result> {
  const { userId } = await requireUser();
  await prisma.profile.update({ where: { id: userId }, data: { coachAutoApply: enabled === true } });
  return { ok: true };
}

async function performCoachEdit(userId: string, e: CoachEdit): Promise<Result<CoachEditDone>> {
  const db = forUser(userId);

  if (e.kind === 'nutrition_targets') {
    const previous = await db.nutritionTarget.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    await db.nutritionTarget.updateMany({ where: { active: true }, data: { active: false } });
    const created = await db.nutritionTarget.create({
      data: {
        userId,
        effectiveFrom: new Date(),
        kcal: e.kcal!,
        proteinG: e.proteinG!,
        carbsG: e.carbsG!,
        fatG: e.fatG!,
        source: 'AI',
        active: true,
      },
      select: { id: true },
    });
    revalidatePath('/nutrition');
    revalidatePath('/dashboard');
    return {
      ok: true,
      data: { changed: 1, undo: { kind: 'nutrition', newId: created.id, previousId: previous?.id ?? null } },
    };
  }

  const plan = await db.workoutPlan.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      days: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          name: true,
          exercises: {
            select: {
              id: true,
              planDayId: true,
              exerciseId: true,
              orderIndex: true,
              targetSets: true,
              targetRepsMin: true,
              targetRepsMax: true,
              targetRir: true,
              restSeconds: true,
              targetDurationSec: true,
              targetDistanceMeters: true,
              notes: true,
              rationale: true,
              exercise: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!plan) return { error: 'NO_PLAN' };

  // Si nombró un día y existe en la rutina, se limita a ese; si no, se aplica a donde esté el ejercicio.
  const dayAsked = e.day ? normalizeName(e.day) : null;
  const dayScoped = dayAsked
    ? plan.days.filter((d) => normalizeName(d.name).includes(dayAsked) || dayAsked.includes(normalizeName(d.name)))
    : [];
  const days = dayScoped.length > 0 ? dayScoped : plan.days;

  const matches = days.flatMap((d) =>
    d.exercises.filter((pe) => sameExercise(pe.exercise.name, e.exercise!)).map((pe) => ({ day: d, pe })),
  );
  if (matches.length === 0) return { error: 'NOT_FOUND' };

  type Row = (typeof matches)[number]['pe'];
  const restoreRow = (pe: Row) => ({
    id: pe.id,
    exerciseId: pe.exerciseId,
    targetSets: pe.targetSets,
    targetRepsMin: pe.targetRepsMin,
    targetRepsMax: pe.targetRepsMax,
    rationale: pe.rationale,
  });

  let changed = 0;
  let undo: CoachUndo;
  if (e.kind === 'remove_exercise') {
    // Un día no puede quedar sin ejercicios.
    const removable = matches.filter((m) => m.day.exercises.length > 1);
    if (removable.length === 0) return { error: 'LAST_EXERCISE' };
    await prisma.planExercise.deleteMany({ where: { id: { in: removable.map((m) => m.pe.id) } } });
    changed = removable.length;
    undo = {
      kind: 'recreate_rows',
      rows: removable.map(({ pe }) => ({
        planDayId: pe.planDayId,
        exerciseId: pe.exerciseId,
        orderIndex: pe.orderIndex,
        targetSets: pe.targetSets,
        targetRepsMin: pe.targetRepsMin,
        targetRepsMax: pe.targetRepsMax,
        targetRir: pe.targetRir,
        restSeconds: pe.restSeconds,
        targetDurationSec: pe.targetDurationSec,
        targetDistanceMeters: pe.targetDistanceMeters,
        notes: pe.notes,
        rationale: pe.rationale,
      })),
    };
  } else if (e.kind === 'replace_exercise') {
    const newId = await resolveExerciseId(e.newExercise!, userId, e.type);
    const { min, max } =
      e.repsMin != null && e.repsMax != null ? widenReps(e.repsMin, e.repsMax, e.type) : { min: null, max: null };
    const before: Row[] = [];
    for (const { day, pe } of matches) {
      if (day.exercises.some((x) => x.exerciseId === newId)) continue;
      before.push(pe);
      await prisma.planExercise.update({
        where: { id: pe.id },
        data: {
          exerciseId: newId,
          // La explicación guardada era del ejercicio anterior.
          rationale: null,
          ...(e.sets != null && e.type === 'STRENGTH' ? { targetSets: e.sets } : {}),
          ...(min != null && max != null && e.type === 'STRENGTH'
            ? { targetRepsMin: min, targetRepsMax: max }
            : {}),
        },
      });
      changed++;
    }
    if (changed === 0) return { error: 'ALREADY' };
    undo = { kind: 'restore_rows', rows: before.map(restoreRow) };
  } else {
    const { min, max } =
      e.repsMin != null && e.repsMax != null ? widenReps(e.repsMin, e.repsMax, 'STRENGTH') : { min: null, max: null };
    for (const { pe } of matches) {
      await prisma.planExercise.update({
        where: { id: pe.id },
        data: {
          ...(e.sets != null ? { targetSets: e.sets } : {}),
          ...(min != null && max != null ? { targetRepsMin: min, targetRepsMax: max } : {}),
        },
      });
      changed++;
    }
    undo = { kind: 'restore_rows', rows: matches.map(({ pe }) => restoreRow(pe)) };
  }

  revalidatePath(`/training/plans/${plan.id}`);
  revalidatePath('/training');
  return { ok: true, data: { changed, undo } };
}

/**
 * Vuelve atrás un cambio que se aplicó con "Editar" (o solo). El cliente trae lo que anotó el
 * servidor al aplicarlo; acá se vuelve a validar y se comprueba que todo sea del propio usuario.
 */
export async function undoCoachEdit(raw: CoachUndo): Promise<Result> {
  const parsed = coachUndoSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const undo = parsed.data;
  const { userId } = await requireUser();
  const db = forUser(userId);

  if (undo.kind === 'nutrition') {
    // Si el objetivo ya cambió de nuevo después, no se pisa lo más reciente.
    const current = await db.nutritionTarget.findFirst({ where: { id: undo.newId, active: true }, select: { id: true } });
    if (!current) return { error: 'CHANGED' };
    await db.nutritionTarget.deleteMany({ where: { id: undo.newId } });
    if (undo.previousId) {
      await db.nutritionTarget.updateMany({ where: { id: undo.previousId }, data: { active: true } });
    }
    revalidatePath('/nutrition');
    revalidatePath('/dashboard');
    return { ok: true };
  }

  // Los ejercicios de la rutina tienen que existir y ser de la biblioteca o propios.
  const exerciseIds = [...new Set(undo.rows.map((r) => r.exerciseId))];
  const usable = await prisma.exercise.count({
    where: { id: { in: exerciseIds }, OR: [{ isCustom: false }, { createdById: userId }] },
  });
  if (usable !== exerciseIds.length) return { error: 'INVALID' };

  if (undo.kind === 'restore_rows') {
    const ids = undo.rows.map((r) => r.id);
    const owned = await prisma.planExercise.count({ where: { id: { in: ids }, planDay: { plan: { userId } } } });
    if (owned !== ids.length) return { error: 'FORBIDDEN' };
    for (const r of undo.rows) {
      await prisma.planExercise.update({
        where: { id: r.id },
        data: {
          exerciseId: r.exerciseId,
          targetSets: r.targetSets,
          targetRepsMin: r.targetRepsMin,
          targetRepsMax: r.targetRepsMax,
          rationale: r.rationale,
        },
      });
    }
    revalidatePath('/training');
    return { ok: true };
  }

  const dayIds = [...new Set(undo.rows.map((r) => r.planDayId))];
  const ownedDays = await prisma.planDay.count({ where: { id: { in: dayIds }, plan: { userId } } });
  if (ownedDays !== dayIds.length) return { error: 'FORBIDDEN' };
  await prisma.planExercise.createMany({ data: undo.rows });
  revalidatePath('/training');
  return { ok: true };
}

const addCoachExerciseSchema = coachExerciseSchema.extend({
  planDayId: z.string().uuid(),
});

/** Agrega a un día de la rutina activa el ejercicio que explicó el coach. */
export async function addCoachExerciseToPlan(
  raw: z.infer<typeof addCoachExerciseSchema>,
): Promise<Result> {
  const parsed = addCoachExerciseSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const e = parsed.data;
  const { userId } = await requireUser();
  const db = forUser(userId);

  // El día tiene que pertenecer a una rutina del propio usuario (mismo chequeo que el editor de rutinas).
  const owned = await db.workoutPlan.findFirst({
    where: { days: { some: { id: e.planDayId } } },
    select: { id: true },
  });
  if (!owned) return { error: 'FORBIDDEN' };
  const day = { id: e.planDayId, planId: owned.id };

  const exerciseId = await resolveExerciseId(e.name, userId, e.type);
  const already = await db.planExercise.findFirst({
    where: { planDayId: day.id, exerciseId },
    select: { id: true },
  });
  if (already) return { error: 'ALREADY' };
  const count = await db.planExercise.count({ where: { planDayId: day.id } });
  const { min, max } = widenReps(e.repsMin, e.repsMax, e.type);

  await db.planExercise.create({
    data:
      e.type === 'CARDIO'
        ? { planDayId: day.id, exerciseId, orderIndex: count, targetSets: 1, targetDurationSec: 1800 }
        : {
            planDayId: day.id,
            exerciseId,
            orderIndex: count,
            targetSets: e.sets,
            targetRepsMin: min,
            targetRepsMax: max,
            restSeconds: 90,
          },
  });
  revalidatePath(`/training/plans/${day.planId}`);
  revalidatePath('/training');
  return { ok: true };
}

const addCoachFoodSchema = coachFoodSchema
  .omit({ suggestedGrams: true })
  .extend({
    grams: z.number().positive().max(5000),
    mealType: z.enum(['BREAKFAST', 'LUNCH', 'MERIENDA', 'DINNER', 'SNACK']),
  });

/** Agrega al día de hoy el alimento que el coach explicó, con la cantidad que elija el usuario. */
export async function addCoachFoodToToday(
  raw: z.infer<typeof addCoachFoodSchema>,
): Promise<Result> {
  const parsed = addCoachFoodSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const f = parsed.data;
  const { profile } = await requireUser();
  const k = f.grams / 100;
  const round1 = (n: number) => Math.round(n * 10) / 10;

  const { addFoodEntry } = await import('@/features/nutrition/actions');
  const res = await addFoodEntry({
    date: localTodayISO(profile.timezone),
    mealType: f.mealType,
    customName: f.name,
    quantity: Math.round(f.grams),
    unit: 'g',
    manualMacros: {
      kcal: Math.round(f.kcalPer100 * k),
      proteinG: round1(f.proteinPer100 * k),
      carbsG: round1(f.carbsPer100 * k),
      fatG: round1(f.fatPer100 * k),
    },
  });
  return res.ok ? { ok: true } : { error: res.error };
}

export async function resetCoachConversation(): Promise<Result> {
  const { userId } = await requireUser();
  const db = forUser(userId);
  await db.aiConversation.deleteMany({ where: { kind: 'COACH' } });
  revalidatePath('/coach');
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Generación de plan con IA                                          */
/* ------------------------------------------------------------------ */

function nutritionDraftFor(profile: {
  sex: 'MALE' | 'FEMALE' | 'OTHER' | null;
  birthdate: Date | null;
  heightCm: number | null;
  activityLevel:
    | 'SEDENTARY'
    | 'LIGHT'
    | 'MODERATE'
    | 'ACTIVE'
    | 'VERY_ACTIVE'
    | null;
  primaryGoal: PrimaryGoal | null;
}, weightKg: number | null, weeklyRateKg: number | null): NutritionDraft | null {
  if (
    !profile.sex ||
    !profile.birthdate ||
    !profile.heightCm ||
    !profile.activityLevel ||
    !profile.primaryGoal ||
    !weightKg
  ) {
    return null;
  }
  const r = computeTargets({
    sex: profile.sex,
    ageYears: ageFromBirthdate(profile.birthdate),
    heightCm: profile.heightCm,
    weightKg,
    activityLevel: profile.activityLevel,
    goal: profile.primaryGoal,
    weeklyRateKg: weeklyRateKg ?? defaultWeeklyRateKg(profile.primaryGoal),
  });
  return {
    kcal: r.kcal,
    proteinG: r.proteinG,
    carbsG: r.carbsG,
    fatG: r.fatG,
    adjustmentPct: r.adjustmentPct,
    rationale: nutritionTargetRationale(
      profile.primaryGoal,
      r.adjustmentPct,
      weeklyRateKg ?? defaultWeeklyRateKg(profile.primaryGoal),
      r.proteinG,
    ),
  };
}

export interface GeneratedPlanView {
  generationId: string;
  plan: PlanDraft;
  nutrition: NutritionDraft | null;
}

export async function generatePlan(
  raw: GeneratePlanInput,
): Promise<Result<GeneratedPlanView>> {
  const parsed = generatePlanSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  if (!aiConfigured()) return { error: 'La IA todavía no está configurada.' };

  const { userId, profile, entitlement } = await requireUser();
  const db = forUser(userId);

  // Borradores anteriores que no se aceptaron ni se descartaron (se generó otra rutina sin
  // elegir) no tienen por qué gastar el cupo del mes: se descartan y se devuelve su lugar.
  try {
    const monthStart = DateTime.now().setZone(profile.timezone).startOf('month').toJSDate();
    const staleThisMonth = await db.aiGeneration.count({
      where: { kind: 'WORKOUT_PLAN', status: 'DRAFT', createdAt: { gte: monthStart } },
    });
    await db.aiGeneration.updateMany({
      where: { kind: 'WORKOUT_PLAN', status: 'DRAFT' },
      data: { status: 'REJECTED' },
    });
    if (staleThisMonth > 0) {
      const { refundPlanGeneration } = await import('@/server/ai/usage');
      for (let i = 0; i < Math.min(staleThisMonth, 10); i++) {
        await refundPlanGeneration(userId, profile.timezone).catch(() => {});
      }
    }
  } catch (e) {
    console.error('[coach] no se pudieron limpiar borradores', e instanceof Error ? e.message : e);
  }

  const excluded = [...new Set((parsed.data.excluded ?? []).map((n) => n.slice(0, 40)))];
  let brief = parsed.data.brief;
  const { days: chosenDays, style: chosenStyle } = parsed.data;
  if (chosenDays || chosenStyle) {
    const parts = [
      chosenDays
        ? `entrenar EXACTAMENTE ${chosenDays} días por semana (el plan tiene que tener exactamente ${chosenDays} días de entrenamiento)`
        : null,
      chosenStyle ? `tipo de rutina: ${STYLE_PROMPT[chosenStyle]}` : null,
    ].filter(Boolean);
    brief = `${brief}
El usuario ELIGIÓ para este plan (tiene prioridad sobre lo que diga su perfil): ${parts.join('; ')}.`;
  }
  if (excluded.length > 0) {
    brief =
      `${brief}
NO puede hacer estos ejercicios (no tiene la máquina o no puede): ${excluded.join(', ')}. ` +
      'Reemplazalos por alternativas que sí pueda hacer (otro equipo, mancuernas o peso corporal) ' +
      'para el mismo grupo muscular, sin repetir esos ejercicios ni variantes que usen el mismo equipo. ' +
      'Mantené el resto de la rutina.';
    // Se guardan en el perfil para que los próximos planes tampoco los incluyan.
    const current = Array.isArray(profile.dislikedExercises)
      ? (profile.dislikedExercises as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];
    const merged = [...new Set([...current, ...excluded])].slice(0, 30);
    await prisma.profile
      .update({ where: { id: userId }, data: { dislikedExercises: merged } })
      .catch((e) => console.error('[coach] no se pudo guardar ejercicios excluidos', e));
  }

  let draft: PlanDraft;
  try {
    const res = await generateWorkoutPlanDraft({
      profile,
      entitlement,
      brief,
      expectedDays: chosenDays,
    });
    draft = res.draft;
  } catch (e) {
    return { error: aiErrorMessage(e) };
  }

  const [goal, lastWeight] = await db.$transaction([
    db.goal.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } }),
    db.weightEntry.findFirst({ orderBy: { date: 'desc' }, select: { weightKg: true } }),
  ]);
  const weightKg = lastWeight?.weightKg ?? goal?.startWeightKg ?? null;
  const nutrition = nutritionDraftFor(profile, weightKg, goal?.weeklyRateKg ?? null);

  const gen = await db.aiGeneration.create({
    data: {
      userId,
      kind: 'WORKOUT_PLAN',
      inputHash: parsed.data.brief.slice(0, 64),
      status: 'DRAFT',
      payload: { plan: draft, nutrition } as object,
    },
    select: { id: true },
  });

  revalidatePath('/coach/new-plan');
  return { ok: true, data: { generationId: gen.id, plan: draft, nutrition } };
}

const MUSCLE_KEYWORDS: Array<[RegExp, MuscleGroup]> = [
  [/press de banca|pecho|pectoral|apertura|fondos|push[- ]?up|flexion/i, 'CHEST'],
  [/domina|jal[oó]n|remo|pull[- ]?up|espalda|dorsal/i, 'BACK'],
  [/press militar|hombro|deltoid|elevaci[oó]n lateral|arnold/i, 'SHOULDERS'],
  [/curl|b[ií]ceps/i, 'BICEPS'],
  [/tr[ií]ceps|extensi[oó]n de codo|press franc[eé]s|copa/i, 'TRICEPS'],
  [/sentadilla|prensa|zancada|extensi[oó]n de cu[aá]driceps|hack|squat|lunge/i, 'QUADS'],
  [/femoral|isquio|peso muerto rumano|curl nórdico|hamstring/i, 'HAMSTRINGS'],
  [/hip thrust|gl[uú]teo|puente de gl[uú]teo|patada de gl[uú]teo/i, 'GLUTES'],
  [/gemelo|pantorrilla|talon|calf|sóleo/i, 'CALVES'],
  [/abdominal|plancha|crunch|core|rueda abdominal|elevaci[oó]n de piernas/i, 'ABS'],
  [/peso muerto|deadlift/i, 'BACK'],
];

function guessMuscle(name: string): MuscleGroup {
  for (const [re, m] of MUSCLE_KEYWORDS) if (re.test(name)) return m;
  return 'OTHER';
}

/** Encuentra el ejercicio en la biblioteca o crea uno custom del usuario. */
async function resolveExerciseId(
  name: string,
  userId: string,
  type: 'STRENGTH' | 'CARDIO',
): Promise<string> {
  const clean = name.trim().slice(0, 80);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "exercise"
    WHERE (is_custom = false OR created_by = ${userId}::uuid)
      AND (name ILIKE ${clean} OR similarity(name, ${clean}) > 0.45)
    ORDER BY (name ILIKE ${clean}) DESC, similarity(name, ${clean}) DESC
    LIMIT 1
  `;
  if (rows[0]) return rows[0].id;

  const created = await prisma.exercise.create({
    data: {
      name: clean,
      type,
      primaryMuscle: guessMuscle(clean),
      isCustom: true,
      createdById: userId,
    },
    select: { id: true },
  });
  return created.id;
}

export async function acceptGeneratedPlan(raw: AcceptPlanInput): Promise<Result<{ planId: string }>> {
  const parsed = acceptPlanSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const db = forUser(userId);

  const gen = await db.aiGeneration.findFirst({
    where: { id: parsed.data.generationId, kind: 'WORKOUT_PLAN', status: 'DRAFT' },
    select: { id: true, payload: true },
  });
  if (!gen) return { error: 'NOT_FOUND' };

  const payload = gen.payload as { plan?: unknown; nutrition?: NutritionDraft | null };
  const planParsed = planDraftSchema.safeParse(payload.plan);
  if (!planParsed.success) return { error: 'INVALID_DRAFT' };
  const draft = planParsed.data;

  // Resolver todos los ejercicios (fuera de transacción; puede crear customs).
  const dayResolved: Array<{
    name: string;
    weekday: number;
    exercises: Array<{
      exerciseId: string;
      orderIndex: number;
      targetSets: number;
      targetRepsMin: number;
      targetRepsMax: number;
      targetRir: number;
      restSeconds: number;
      targetDurationSec: number | null;
      targetDistanceMeters: number | null;
      notes: string | null;
      rationale: string | null;
    }>;
  }> = [];
  const skip = new Set(parsed.data.overrides?.skip ?? []);
  const swaps = parsed.data.overrides?.swap;
  for (const [di, d] of draft.days.entries()) {
    const exercises = [];
    const seenExerciseIds = new Set<string>();
    for (const [ei, e] of d.exercises.entries()) {
      if (skip.has(`${di}:${ei}`)) continue;
      // Sólo se acepta una alternativa que la propia IA propuso para este ejercicio.
      const picked = swaps?.[`${di}:${ei}`];
      const exerciseName = picked && e.alternatives?.includes(picked) ? picked : e.name;
      const exerciseId = await resolveExerciseId(exerciseName, userId, e.type ?? 'STRENGTH');
      // Dos nombres distintos de la IA pueden resolver al mismo ejercicio de
      // la biblioteca (match difuso); sin este chequeo el mismo ejercicio
      // termina duplicado dentro del mismo día.
      if (seenExerciseIds.has(exerciseId)) continue;
      seenExerciseIds.add(exerciseId);
      exercises.push({
        exerciseId,
        orderIndex: exercises.length,
        targetSets: e.sets,
        targetRepsMin: widenReps(e.repsMin, e.repsMax, e.type).min,
        targetRepsMax: widenReps(e.repsMin, e.repsMax, e.type).max,
        targetRir: e.rir,
        restSeconds: e.restSeconds,
        targetDurationSec: e.durationMinutes ? Math.round(e.durationMinutes * 60) : null,
        targetDistanceMeters: e.distanceKm ? Math.round(e.distanceKm * 1000) : null,
        notes: e.note?.trim() || null,
        rationale: e.rationale?.trim() || null,
      });
    }
    if (exercises.length > 0) dayResolved.push({ name: d.name, weekday: d.weekday, exercises });
  }
  if (dayResolved.length === 0) return { error: 'EMPTY_PLAN' };

  const planName = parsed.data.overrides?.name?.trim() || draft.name;

  // Sin transacción interactiva: el create anidado (4 días × ~5 ejercicios) sobre
  // el pooler con connection_limit=15 excede el timeout de 5s de Prisma (P2028).
  // La ventana sin plan activo entre estos pasos es sub-segundo y tolerable.
  await db.workoutPlan.updateMany({ where: { isActive: true }, data: { isActive: false } });
  const plan = await db.workoutPlan.create({
    data: {
      userId,
      name: planName.slice(0, 60),
      description: draft.description.slice(0, 300),
      isActive: true,
      source: 'AI',
      aiGenerationId: gen.id,
      days: {
        create: dayResolved.map((d, di) => ({
          name: d.name,
          orderIndex: di,
          weekday: d.weekday,
          exercises: { create: d.exercises },
        })),
      },
    },
    select: { id: true },
  });
  await db.aiGeneration.updateMany({
    where: { id: gen.id },
    data: { status: 'ACCEPTED', acceptedAt: new Date() },
  });

  // Objetivos nutricionales (deterministas), sólo si el usuario lo pidió.
  if (parsed.data.overrides?.applyNutrition && payload.nutrition) {
    const n = payload.nutrition;
    await db.$transaction([
      db.nutritionTarget.updateMany({ where: { active: true }, data: { active: false } }),
      db.nutritionTarget.create({
        data: {
          userId,
          effectiveFrom: new Date(),
          kcal: n.kcal,
          proteinG: n.proteinG,
          carbsG: n.carbsG,
          fatG: n.fatG,
          rationale: n.rationale,
          source: 'AI',
          active: true,
        },
      }),
    ]);
  }

  revalidatePath('/training');
  revalidatePath('/dashboard');
  revalidatePath('/coach/new-plan');
  return { ok: true, data: { planId: plan.id } };
}

/**
 * Grupo muscular principal de cada nombre de ejercicio del borrador (y de sus
 * alternativas), para el resumen de series semanales. Usa la biblioteca; si el
 * nombre no está, el cliente cae a una heurística por palabras clave.
 */
export async function resolveExerciseMuscles(raw: {
  names: string[];
}): Promise<Result<Record<string, MuscleGroup>>> {
  const names = [...new Set((raw.names ?? []).map((n) => String(n).slice(0, 80)))].slice(0, 150);
  if (names.length === 0) return { ok: true, data: {} };
  const { userId } = await requireUser();

  const rows = await prisma.$queryRaw<Array<{ name: string; primary_muscle: MuscleGroup }>>`
    SELECT name, primary_muscle
    FROM "exercise"
    WHERE is_custom = false OR created_by = ${userId}::uuid
  `;
  const catalog = rows.map((r) => ({ key: normalizeName(r.name), muscle: r.primary_muscle }));
  const exact = new Map(catalog.map((c) => [c.key, c.muscle]));

  const out: Record<string, MuscleGroup> = {};
  for (const name of names) {
    const key = normalizeName(name);
    const hit =
      exact.get(key) ??
      // Variantes del mismo ejercicio ("Press inclinado con mancuernas sentado").
      catalog.find((c) => c.key.length >= 8 && (key.includes(c.key) || c.key.includes(key)))?.muscle;
    if (hit) out[name] = hit;
  }
  return { ok: true, data: out };
}

export async function discardGeneratedPlan(raw: { generationId: string }): Promise<Result> {
  const id = acceptPlanSchema.shape.generationId.safeParse(raw.generationId);
  if (!id.success) return { error: 'INVALID' };
  const { userId, profile } = await requireUser();
  const { count } = await forUser(userId).aiGeneration.updateMany({
    where: { id: id.data, kind: 'WORKOUT_PLAN', status: 'DRAFT' },
    data: { status: 'REJECTED' },
  });
  if (count > 0) {
    // No se quedó con este borrador: le devolvemos el lugar en el cupo
    // mensual para que pueda pedir otro en el momento, sin esperar al mes que viene.
    const { refundPlanGeneration } = await import('@/server/ai/usage');
    await refundPlanGeneration(userId, profile.timezone).catch(() => {});
  }
  revalidatePath('/coach/new-plan');
  return { ok: true };
}
