'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { getActiveTrainer } from '@/server/trainers';
import {
  draftCheckinFeedback,
  generateRoutineForClient,
  suggestDietForClient,
  trainerAssistantReply,
  type DietSuggestion,
} from '@/server/trainer-ai';

interface Result<T = void> {
  ok?: boolean;
  error?: string;
  detail?: string;
  data?: T;
}

const messageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) }))
    .max(20)
    .default([]),
  clientId: z.string().uuid().nullable().optional(),
});

/** Pregunta al asistente de IA del entrenador (con un cliente elegido o sobre todos). */
export async function askTrainerAssistant(raw: z.input<typeof messageSchema>): Promise<Result<{ text: string }>> {
  const parsed = messageSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, profile } = await requireUser();
  const trainer = await getActiveTrainer(userId);
  if (!trainer) return { error: 'FORBIDDEN' };

  const res = await trainerAssistantReply({
    trainerId: userId,
    trainerName: trainer.displayName,
    timezone: profile.timezone,
    history: parsed.data.history,
    userMessage: parsed.data.message,
    clientId: parsed.data.clientId ?? null,
  });
  return 'ok' in res ? { ok: true, data: { text: res.text } } : { error: res.error, detail: res.detail };
}

const draftSchema = z.object({
  clientId: z.string().uuid(),
  brief: z.string().trim().max(500).optional(),
});

/** Arma con IA un borrador de rutina para el cliente (queda sin activar para que el entrenador lo revise). */
export async function createRoutineWithAi(raw: z.input<typeof draftSchema>): Promise<Result<{ planId: string }>> {
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId, profile } = await requireUser();
  const trainer = await getActiveTrainer(userId);
  if (!trainer) return { error: 'FORBIDDEN' };

  const res = await generateRoutineForClient({
    trainerId: userId,
    clientId: parsed.data.clientId,
    timezone: profile.timezone,
    brief: parsed.data.brief ?? '',
  });
  if ('error' in res) return { error: res.error, detail: res.detail };
  revalidatePath(`/trainer/clients/${parsed.data.clientId}`);
  return { ok: true, data: { planId: res.planId } };
}

/** Objetivos de dieta sugeridos para el cliente (cálculo según su perfil, peso y meta). */
export async function suggestClientDiet(raw: { clientId: string }): Promise<Result<DietSuggestion>> {
  const id = z.string().uuid().safeParse(raw.clientId);
  if (!id.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const trainer = await getActiveTrainer(userId);
  if (!trainer) return { error: 'FORBIDDEN' };
  const suggestion = await suggestDietForClient(userId, id.data);
  return suggestion ? { ok: true, data: suggestion } : { error: 'MISSING_DATA' };
}

/** Borrador de feedback para una revisión semanal: el entrenador lo corrige y lo envía. */
export async function suggestCheckinFeedback(raw: { clientId: string; checkinId: string }): Promise<Result<{ text: string }>> {
  const client = z.string().uuid().safeParse(raw.clientId);
  const checkin = z.string().uuid().safeParse(raw.checkinId);
  if (!client.success || !checkin.success) return { error: 'INVALID' };
  const { userId, profile } = await requireUser();
  const trainer = await getActiveTrainer(userId);
  if (!trainer) return { error: 'FORBIDDEN' };
  const res = await draftCheckinFeedback({
    trainerId: userId,
    trainerName: trainer.displayName,
    clientId: client.data,
    checkinId: checkin.data,
    timezone: profile.timezone,
  });
  return 'ok' in res ? { ok: true, data: { text: res.text } } : { error: res.error, detail: res.detail };
}
