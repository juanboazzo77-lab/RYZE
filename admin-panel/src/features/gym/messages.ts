/** Mensajes del dueño del gimnasio a sus clientes: validación. Función pura. */

export const MAX_MESSAGE_TITLE = 80;
export const MAX_MESSAGE_BODY = 1500;

const clip = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export interface MessageInput {
  title: string;
  body: string;
  email: boolean;
}

export function cleanMessage(input: { title?: unknown; body?: unknown; email?: unknown }): MessageInput | { error: 'TITLE' | 'BODY' } {
  const title = clip(input.title, MAX_MESSAGE_TITLE);
  if (title.length < 3) return { error: 'TITLE' };
  const body = clip(input.body, MAX_MESSAGE_BODY);
  if (body.length < 5) return { error: 'BODY' };
  return { title, body, email: input.email === true };
}
