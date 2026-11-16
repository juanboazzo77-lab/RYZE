import 'server-only';
import { forUser } from '@/server/user-db';
import { COACH_TOPICS, topicOfTitle, type CoachTopic } from './topics';

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

/** Los mensajes de cada tema, del más viejo al más nuevo (los últimos de cada tema, para no cargar de más). */
export async function getCoachThreads(userId: string, perTopic = 80): Promise<Record<CoachTopic, CoachMessage[]>> {
  const db = forUser(userId);
  const convos = await db.aiConversation.findMany({
    where: { kind: 'COACH' },
    select: {
      title: true,
      messages: { orderBy: { createdAt: 'desc' }, take: perTopic, select: { id: true, role: true, content: true, createdAt: true } },
    },
  });
  const out = Object.fromEntries(COACH_TOPICS.map((t) => [t, [] as CoachMessage[]])) as Record<CoachTopic, CoachMessage[]>;
  for (const c of convos) {
    const topic = topicOfTitle(c.title);
    for (const m of c.messages) {
      out[topic].push({ id: m.id, role: m.role === 'ASSISTANT' ? 'assistant' : 'user', content: m.content, createdAt: m.createdAt.toISOString() });
    }
  }
  for (const t of COACH_TOPICS) {
    out[t].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (out[t].length > perTopic) out[t] = out[t].slice(-perTopic);
  }
  return out;
}
