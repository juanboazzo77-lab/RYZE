import 'server-only';
import { forUser } from '@/server/user-db';
import { COACH_TOPICS, conversationTitle, topicOfStored, type CoachHistoryItem, type CoachTopic } from './topics';

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

/** Los mensajes de cada tema (solo de las conversaciones abiertas), del más viejo al más nuevo. */
export async function getCoachThreads(userId: string, perTopic = 80): Promise<Record<CoachTopic, CoachMessage[]>> {
  const db = forUser(userId);
  const convos = await db.aiConversation.findMany({
    where: { kind: 'COACH', archivedAt: null },
    select: {
      topic: true,
      messages: { orderBy: { createdAt: 'desc' }, take: perTopic, select: { id: true, role: true, content: true, createdAt: true } },
    },
  });
  const out = Object.fromEntries(COACH_TOPICS.map((t) => [t, [] as CoachMessage[]])) as Record<CoachTopic, CoachMessage[]>;
  for (const c of convos) {
    const topic = topicOfStored(c.topic);
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

export const historySelect = {
  id: true,
  title: true,
  topic: true,
  updatedAt: true,
  _count: { select: { messages: true } },
  // El último mensaje: su fecha es la "última actividad" de la conversación (updatedAt cambia al archivar).
  messages: { orderBy: { createdAt: 'desc' as const }, take: 1, select: { createdAt: true } },
};

type HistoryRow = {
  id: string;
  title: string | null;
  topic: string | null;
  updatedAt: Date;
  _count: { messages: number };
  messages: Array<{ createdAt: Date }>;
};

/** Una conversación guardada para el historial. Sin nombre guardado, se arma con lo primero que se preguntó. */
export function toHistoryItem(c: HistoryRow, firstUserText?: string | null): CoachHistoryItem {
  return {
    id: c.id,
    topic: topicOfStored(c.topic),
    title: c.title?.trim() || conversationTitle(firstUserText) || '',
    updatedAt: (c.messages[0]?.createdAt ?? c.updatedAt).toISOString(),
    messageCount: c._count.messages,
  };
}

/** Lo primero que escribió la persona en cada conversación (para nombrar las que quedaron sin nombre). */
export async function firstUserTexts(db: ReturnType<typeof forUser>, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db.aiMessage.findMany({
    where: { conversationId: { in: ids }, role: 'USER' },
    orderBy: { createdAt: 'asc' },
    distinct: ['conversationId'],
    select: { conversationId: true, content: true },
  });
  return new Map(rows.map((r) => [r.conversationId, r.content]));
}

/** Las conversaciones guardadas (archivadas) de la persona, de la más reciente a la más vieja. Sin los mensajes. */
export async function getCoachHistory(userId: string, limit = 100): Promise<CoachHistoryItem[]> {
  const db = forUser(userId);
  const rows = await db.aiConversation.findMany({
    where: { kind: 'COACH', archivedAt: { not: null } },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: historySelect,
  });
  const withMessages = rows.filter((r) => r._count.messages > 0);
  const firstTexts = await firstUserTexts(db, withMessages.filter((r) => !r.title?.trim()).map((r) => r.id));
  return withMessages.map((r) => toHistoryItem(r, firstTexts.get(r.id))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
