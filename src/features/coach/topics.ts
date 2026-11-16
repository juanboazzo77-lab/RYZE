/**
 * Temas del chat con el AI Coach. Cada tema es una conversación aparte (se guarda en `AiConversation.title`), así que
 * el cliente no ve todas las preguntas juntas y el coach tampoco arrastra el historial de otros temas. Dentro de cada
 * tema los mensajes se agrupan por día. Lógica pura.
 */

export const COACH_TOPICS = ['training', 'nutrition', 'progress', 'health', 'general'] as const;
export type CoachTopic = (typeof COACH_TOPICS)[number];
export const DEFAULT_COACH_TOPIC: CoachTopic = 'general';

export function isCoachTopic(value: unknown): value is CoachTopic {
  return typeof value === 'string' && (COACH_TOPICS as readonly string[]).includes(value);
}

/** El tema de una conversación guardada. Las conversaciones viejas (sin tema) quedan en "Otras consultas". */
export function topicOfStored(topic: string | null | undefined): CoachTopic {
  return isCoachTopic(topic) ? topic : DEFAULT_COACH_TOPIC;
}

type TopicWhere = { topic: string | null };

function topicWhere(topic: CoachTopic): TopicWhere[] {
  return topic === DEFAULT_COACH_TOPIC ? [{ topic: null }, { topic: DEFAULT_COACH_TOPIC }] : [{ topic }];
}

/** Las conversaciones ABIERTAS de un tema (las archivadas quedan en el historial). El general incluye las viejas sin tema. */
export function topicConversationFilter(topic: CoachTopic): { kind: 'COACH'; archivedAt: null; OR: TopicWhere[] } {
  return { kind: 'COACH', archivedAt: null, OR: topicWhere(topic) };
}

/* ---------- Nombre de la conversación ---------- */

const TITLE_MAX = 48;
const GREETING = /^(buen[oa]s?\s+(d[ií]as?|tardes?|noches?)|hola+|buenas+|hey|ey|che|holis|hello|hi|ol[aá])\b[\s,.!:;-]*/i;

/**
 * Nombre de una conversación a partir de lo primero que se preguntó: sin saludo, sin signos de pregunta sueltos,
 * con la primera letra en mayúscula y cortado en una palabra entera. Sin nada útil, devuelve null.
 */
export function conversationTitle(firstMessage: string | null | undefined): string | null {
  let s = (firstMessage ?? '').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 2; i++) s = s.replace(GREETING, '').trim();
  // Se queda con la primera oración (hasta el primer punto o signo de cierre), sin signos de apertura.
  s = s.replace(/^[¿¡"'“‘(\s]+/, '');
  const firstSentence = s.split(/(?<=[.?!])\s+/)[0] ?? s;
  s = firstSentence.replace(/[?!.…\s]+$/g, '').replace(/[¿¡]/g, '').trim();
  if (s.length < 3) return null;
  if (s.length > TITLE_MAX) {
    const cut = s.slice(0, TITLE_MAX);
    const lastSpace = cut.lastIndexOf(' ');
    s = `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).replace(/[,;:\s]+$/, '')}…`;
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Una conversación archivada, como se muestra en el historial (sin los mensajes). */
export interface CoachHistoryItem {
  id: string;
  topic: CoachTopic;
  title: string;
  /** Última actividad (ISO). */
  updatedAt: string;
  messageCount: number;
}

/** Qué le decimos a la IA sobre el tema de la charla (el coach se enfoca en eso, sin cerrarse a otras preguntas). */
export function topicPromptNote(topic: CoachTopic): string {
  if (topic === 'general') return '';
  const focus: Record<Exclude<CoachTopic, 'general'>, string> = {
    training: 'entrenamiento (rutina, ejercicios, series, técnica, progresión)',
    nutrition: 'alimentación (dieta, comidas, calorías, proteínas, qué comer)',
    progress: 'progreso (peso, avance hacia el objetivo, revisión semanal, constancia)',
    health: 'lesiones y dolores (molestias, cómo adaptar el entrenamiento; ante dolor fuerte o persistente, recomendar ver a un profesional de la salud)',
  };
  return `Tema de esta conversación: ${focus[topic]}. Enfocate en ese tema; si la persona pregunta por otra cosa, respondé igual y, si conviene, sugerile usar el tema que corresponde.`;
}

/* ---------- Días ---------- */

const pad = (n: number) => String(n).padStart(2, '0');

/** Día calendario LOCAL de una fecha, como AAAA-MM-DD. */
export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export type DayLabel = { kind: 'today' } | { kind: 'yesterday' } | { kind: 'date'; key: string };

export function dayLabel(key: string, now: Date = new Date()): DayLabel {
  if (key === localDayKey(now)) return { kind: 'today' };
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (key === localDayKey(y)) return { kind: 'yesterday' };
  return { kind: 'date', key };
}

export interface DayGroup<T> {
  key: string;
  label: DayLabel;
  items: T[];
}

/** Agrupa mensajes (ya ordenados de más viejo a más nuevo) por día local, manteniendo el orden. */
export function groupByDay<T extends { createdAt: string }>(items: T[], now: Date = new Date()): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const d = new Date(item.createdAt);
    const key = Number.isNaN(d.getTime()) ? 'sin-fecha' : localDayKey(d);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, label: dayLabel(key, now), items: [item] });
  }
  return groups;
}
