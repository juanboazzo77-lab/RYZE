import 'server-only';
import { forUser } from '@/server/user-db';

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface CoachThread {
  conversationId: string | null;
  messages: CoachMessage[];
}

/** Hilo activo del AI Coach (el más reciente). */
export async function getCoachThread(userId: string): Promise<CoachThread> {
  const db = forUser(userId);
  const convo = await db.aiConversation.findFirst({
    where: { kind: 'COACH' },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, role: true, content: true, createdAt: true },
      },
    },
  });

  if (!convo) return { conversationId: null, messages: [] };

  return {
    conversationId: convo.id,
    messages: convo.messages.map((m) => ({
      id: m.id,
      role: m.role === 'ASSISTANT' ? 'assistant' : 'user',
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export interface PlanGenerationView {
  id: string;
  createdAt: string;
  payload: unknown;
}

/** Última generación de plan en estado DRAFT (para retomar el preview). */
export async function getLatestPlanDraft(userId: string): Promise<PlanGenerationView | null> {
  const db = forUser(userId);
  const gen = await db.aiGeneration.findFirst({
    where: { kind: 'WORKOUT_PLAN', status: 'DRAFT' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true, payload: true },
  });
  if (!gen) return null;
  return { id: gen.id, createdAt: gen.createdAt.toISOString(), payload: gen.payload };
}
