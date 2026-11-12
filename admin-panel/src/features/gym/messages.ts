/** Mensajes del dueño del gimnasio a sus clientes: validación. Función pura. */

export const MAX_MESSAGE_TITLE = 80;
export const MAX_MESSAGE_BODY = 1500;

const clip = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Cuántos días se muestra el mensaje en la pantalla principal de los clientes. */
export const MESSAGE_DAYS = [1, 3, 7, 14, 30] as const;
export const DEFAULT_MESSAGE_DAYS = 7;

export interface MessageInput {
  title: string;
  body: string;
  days: number;
}

export function cleanMessage(input: { title?: unknown; body?: unknown; days?: unknown }): MessageInput | { error: 'TITLE' | 'BODY' } {
  const title = clip(input.title, MAX_MESSAGE_TITLE);
  if (title.length < 3) return { error: 'TITLE' };
  const body = clip(input.body, MAX_MESSAGE_BODY);
  if (body.length < 5) return { error: 'BODY' };
  const d = Number(input.days);
  const days = (MESSAGE_DAYS as readonly number[]).includes(d) ? d : DEFAULT_MESSAGE_DAYS;
  return { title, body, days };
}
