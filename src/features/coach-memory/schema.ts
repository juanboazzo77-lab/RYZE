import { z } from 'zod';

/**
 * Memoria del coach: hechos duraderos que el usuario contó (lesiones, gustos, horarios,
 * restricciones). El coach los anota solo a partir del chat; la persona puede agregar, ver y borrar.
 */

export const MEMORY_CATEGORIES = ['HEALTH', 'PREFERENCE', 'SCHEDULE', 'GOAL', 'OTHER'] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

/** Tope de recuerdos por persona: se mandan a la IA en cada mensaje. */
export const MAX_MEMORIES = 40;
export const MAX_MEMORY_LEN = 200;
/** Lo más que se anota solo por mensaje. */
export const MAX_LEARNED_PER_MESSAGE = 3;

export const memoryTextSchema = z.string().trim().min(3).max(MAX_MEMORY_LEN);

export const addMemorySchema = z.object({
  text: memoryTextSchema,
  category: z.enum(MEMORY_CATEGORIES).catch('OTHER'),
});
export type AddMemoryInput = z.infer<typeof addMemorySchema>;

/** Lo que devuelve la IA al decidir qué anotar o qué olvidar. */
export const learnToolSchema = z.object({
  add: z.array(z.object({ text: z.string(), category: z.string() })).catch([]),
  remove: z.array(z.number()).catch([]),
});

/** Para comparar recuerdos: sin tildes, mayúsculas ni signos. */
export function normalizeMemory(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** ¿Ya está anotado (igual, o uno contiene al otro)? */
export function isDuplicateMemory(text: string, existing: string[]): boolean {
  const a = normalizeMemory(text);
  if (!a) return true;
  return existing.some((e) => {
    const b = normalizeMemory(e);
    if (a === b) return true;
    const short = a.length < b.length ? a : b;
    return short.length >= 14 && (a.includes(b) || b.includes(a));
  });
}

export function asMemoryCategory(value: string): MemoryCategory {
  return (MEMORY_CATEGORIES as readonly string[]).includes(value) ? (value as MemoryCategory) : 'OTHER';
}

/**
 * Qué anotar y qué olvidar a partir de lo que devolvió la IA. Pura, para poder probarla:
 * descarta lo duplicado, lo demasiado largo o corto y los índices que no existen.
 */
export function planMemoryChanges(
  raw: { add: Array<{ text: string; category: string }>; remove: number[] },
  existing: Array<{ id: string; content: string; source: string }>,
): { add: Array<{ text: string; category: MemoryCategory }>; removeIds: string[] } {
  const known = existing.map((e) => e.content);
  const add: Array<{ text: string; category: MemoryCategory }> = [];
  for (const item of raw.add) {
    const text = item.text.trim().replace(/\s+/g, ' ');
    if (text.length < 3 || text.length > MAX_MEMORY_LEN) continue;
    if (isDuplicateMemory(text, [...known, ...add.map((a) => a.text)])) continue;
    add.push({ text, category: asMemoryCategory(item.category) });
    if (add.length >= MAX_LEARNED_PER_MESSAGE) break;
  }
  // Los índices son los de la lista que se le mostró a la IA (empiezan en 1). Sólo se borra lo que
  // anotó el propio coach: lo que escribió la persona no lo toca sola.
  const removeIds = [
    ...new Set(
      raw.remove
        .map((n) => existing[Math.round(n) - 1])
        .filter((e): e is (typeof existing)[number] => !!e && e.source === 'CHAT')
        .map((e) => e.id),
    ),
  ].slice(0, MAX_LEARNED_PER_MESSAGE);
  return { add, removeIds };
}
