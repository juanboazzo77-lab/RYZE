'use server';

import { revalidatePath } from 'next/cache';
import type { MuscleGroup, PrimaryGoal } from '@prisma/client';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { prisma } from '@/server/db';
import { AiError } from '@/server/ai/errors';
import { aiConfigured } from '@/server/ai/config';
import { runCoachTurn, generateWorkoutPlanDraft } from '@/server/ai/gateway';
import { computeTargets, ageFromBirthdate, defaultWeeklyRateKg } from '@/lib/nutrition/targets';
import { planDraftSchema, type PlanDraft, type NutritionDraft } from './plan-schema';
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
    return e.userMessage;
  }
  console.error('[coach] error inesperado', e instanceof Error ? `${e.name}: ${e.message}` : e);
  return 'No pudimos generar la respuesta ahora. Probá de nuevo en un rato.';
}

/* ------------------------------------------------------------------ */
/* AI Coach — chat                                                    */
/* ------------------------------------------------------------------ */

export async function sendCoachMessage(
  raw: SendMessageInput,
): Promise<Result<{ reply: string }>> {
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
  try {
    const res = await runCoachTurn({
      profile,
      entitlement,
      history,
      userMessage: parsed.data.text,
    });
    reply = res.text;
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
  return { ok: true, data: { reply } };
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

  let draft: PlanDraft;
  try {
    const res = await generateWorkoutPlanDraft({ profile, entitlement, brief: parsed.data.brief });
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
async function resolveExerciseId(name: string, userId: string): Promise<string> {
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
      notes: string | null;
    }>;
  }> = [];
  for (const d of draft.days) {
    const exercises = [];
    for (let i = 0; i < d.exercises.length; i++) {
      const e = d.exercises[i]!;
      const exerciseId = await resolveExerciseId(e.name, userId);
      exercises.push({
        exerciseId,
        orderIndex: i,
        targetSets: e.sets,
        targetRepsMin: Math.min(e.repsMin, e.repsMax),
        targetRepsMax: Math.max(e.repsMin, e.repsMax),
        targetRir: e.rir,
        restSeconds: e.restSeconds,
        notes: e.note?.trim() || null,
      });
    }
    dayResolved.push({ name: d.name, weekday: d.weekday, exercises });
  }

  const planName = parsed.data.overrides?.name?.trim() || draft.name;

  // Sin transacción interactiva: el create anidado (4 días × ~5 ejercicios) sobre
  // el pooler con connection_limit=1 excede el timeout de 5s de Prisma (P2028).
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

export async function discardGeneratedPlan(raw: { generationId: string }): Promise<Result> {
  const id = acceptPlanSchema.shape.generationId.safeParse(raw.generationId);
  if (!id.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  await forUser(userId).aiGeneration.updateMany({
    where: { id: id.data, kind: 'WORKOUT_PLAN', status: 'DRAFT' },
    data: { status: 'REJECTED' },
  });
  revalidatePath('/coach/new-plan');
  return { ok: true };
}
