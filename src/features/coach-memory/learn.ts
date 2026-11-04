import 'server-only';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { forUser } from '@/server/user-db';
import { activeProvider, modelFor } from '@/server/ai/config';
import { recordUsage } from '@/server/ai/usage';
import type { AiToolSpec } from '@/server/ai/providers/types';
import { learnToolSchema, MAX_MEMORIES, planMemoryChanges } from './schema';

export const LEARN_TOOL: AiToolSpec = (() => {
  const schema = zodToJsonSchema(learnToolSchema, { target: 'jsonSchema7', $refStrategy: 'none' }) as Record<
    string,
    unknown
  >;
  delete schema.$schema;
  return {
    name: 'save_memory_changes',
    description:
      'Anota lo nuevo que el usuario contó sobre sí mismo y olvida lo que dejó de ser cierto. Llamala sólo si hay algo para anotar u olvidar.',
    inputSchema: schema,
  };
})();

export const LEARN_SYSTEM = `Sos el módulo de memoria del AI Coach de una app de entrenamiento y nutrición.
Tu trabajo: mirar el ÚLTIMO mensaje del usuario y decidir si contó algo DURADERO sobre sí mismo que
conviene recordar para personalizar sus planes y respuestas futuras.

SÍ anotá (una frase corta y concreta, en tercera persona o neutra, en español):
- Lesiones, molestias, condiciones o limitaciones físicas ("Le molesta la zona lumbar con cargas axiales").
- Gustos y rechazos de ejercicios o comidas ("No le gusta el pescado", "Odia correr en cinta").
- Horarios, turnos de trabajo, días fijos, viajes largos ("Trabaja de noche, entrena a las 7").
- Equipamiento o lugar ("Entrena en casa con mancuernas hasta 20 kg").
- Deportes, competencias o metas concretas ("Juega fútbol los viernes", "Maratón en marzo").
- Restricciones de dieta, alergias, presupuesto, cómo cocina.

NO anotes:
- Lo pasajero (qué comió hoy, cómo se siente hoy, una duda puntual, una pregunta).
- Lo que dijo el coach (sólo cuenta lo que dijo el usuario).
- Lo que ya está en la lista de recuerdos, aunque esté dicho con otras palabras.
- Opiniones sobre la app ni datos sin relación con su entrenamiento o su alimentación.
- Nada que no haya dicho claramente (no supongas ni inventes).

Categorías: HEALTH (salud, lesiones), PREFERENCE (gustos y rechazos), SCHEDULE (horarios y rutina de
vida), GOAL (metas, deportes, competencias), OTHER (el resto).

Si algo de la lista dejó de ser cierto por lo que el usuario dice ahora ("ya no me duele la
lumbar"), pasá su número en "remove" y, si hay un dato nuevo, agregalo en "add".
Anotá como máximo 3 cosas. Si no hay nada para anotar ni para olvidar, NO llames a la herramienta
y respondé sólo "NO".`;

/** Mensajes muy cortos casi nunca traen algo para recordar: no se gasta una llamada. */
const MIN_LEN = 14;

/**
 * Después de que el coach responde, mira lo que dijo la persona y anota lo duradero. Nunca lanza
 * error: es un extra y no puede romper el chat.
 */
export async function learnFromChat(args: {
  userId: string;
  timezone: string;
  userMessage: string;
  assistantReply: string;
}): Promise<void> {
  const { userId, timezone, userMessage, assistantReply } = args;
  if (userMessage.trim().length < MIN_LEN) return;

  try {
    const db = forUser(userId);
    const existing = await db.coachMemory.findMany({
      orderBy: { createdAt: 'asc' },
      take: MAX_MEMORIES,
      select: { id: true, category: true, content: true, source: true },
    });

    const list = existing.length
      ? existing.map((e, i) => `${i + 1}. [${e.category}] ${e.content}`).join('\n')
      : '(todavía no hay recuerdos)';
    const model = modelFor('coach_chat');
    const res = await activeProvider().generate({
      model,
      system: LEARN_SYSTEM,
      messages: [
        {
          role: 'user',
          content:
            `Recuerdos actuales:\n${list}\n\n` +
            `Último mensaje del usuario:\n${userMessage.slice(0, 1500)}\n\n` +
            `Respuesta del coach (sólo contexto, no la anotes):\n${assistantReply.slice(0, 800)}`,
        },
      ],
      tools: [LEARN_TOOL],
      maxOutputTokens: 700,
      timeoutMs: 25_000,
      temperature: 0,
      thinking: false,
    });
    // El costo se registra, pero no cuenta como un mensaje más del día.
    await recordUsage(userId, 'coach_chat', model, res.usage, timezone, false);

    const call = res.toolUses.find((t) => t.name === 'save_memory_changes');
    if (!call) return;
    const parsed = learnToolSchema.safeParse(call.input);
    if (!parsed.success) return;

    const { add, removeIds } = planMemoryChanges(parsed.data, existing);
    if (removeIds.length > 0) {
      await db.coachMemory.deleteMany({ where: { id: { in: removeIds } } });
    }
    if (add.length === 0) return;

    // Si no hay lugar, se hace lugar borrando lo más viejo que anotó el propio coach.
    const kept = existing.length - removeIds.length;
    const overflow = kept + add.length - MAX_MEMORIES;
    if (overflow > 0) {
      const oldest = existing.filter((e) => e.source === 'CHAT' && !removeIds.includes(e.id)).slice(0, overflow);
      if (oldest.length < overflow) return; // lo escrito por la persona no se borra solo
      await db.coachMemory.deleteMany({ where: { id: { in: oldest.map((o) => o.id) } } });
    }
    await db.coachMemory.createMany({
      data: add.map((a) => ({ userId, content: a.text, category: a.category, source: 'CHAT' })),
    });
  } catch (e) {
    console.error('[coach-memory] no se pudo aprender del mensaje', e instanceof Error ? e.message : e);
  }
}
