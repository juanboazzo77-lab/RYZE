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

/** El tema de una conversación guardada. Las conversaciones viejas (sin título) quedan en "Otras consultas". */
export function topicOfTitle(title: string | null | undefined): CoachTopic {
  return isCoachTopic(title) ? title : DEFAULT_COACH_TOPIC;
}

/** Filtro de base de datos para encontrar las conversaciones de un tema (el general incluye las viejas sin título). */
export function topicConversationFilter(topic: CoachTopic): { kind: 'COACH'; OR: Array<{ title: string | null }> } {
  return { kind: 'COACH', OR: topic === DEFAULT_COACH_TOPIC ? [{ title: null }, { title: DEFAULT_COACH_TOPIC }] : [{ title: topic }] };
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
