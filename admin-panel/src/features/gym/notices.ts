/**
 * Avisos del administrador a los gimnasios: validación de lo que se escribe y a quién le toca cada aviso. Funciones puras.
 */

export const MAX_TITLE = 80;
export const MAX_BODY = 2000;

const clip = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export interface NoticeInput {
  title: string;
  body: string;
  link: string | null;
  /** Vacío = a todos los gimnasios. */
  gymIds: string[];
  email: boolean;
}

/** Valida un aviso: título, mensaje, enlace opcional (solo http/https) y a qué gimnasios va. */
export function cleanNotice(input: { title?: unknown; body?: unknown; link?: unknown; gymIds?: unknown; email?: unknown }): NoticeInput | { error: 'TITLE' | 'BODY' | 'LINK' } {
  const title = clip(input.title, MAX_TITLE);
  if (title.length < 3) return { error: 'TITLE' };
  const body = clip(input.body, MAX_BODY);
  if (body.length < 5) return { error: 'BODY' };
  const rawLink = clip(input.link, 300);
  if (rawLink && !/^https?:\/\/[^\s]+$/i.test(rawLink)) return { error: 'LINK' };
  const gymIds = [...new Set((Array.isArray(input.gymIds) ? input.gymIds : []).filter((x): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x)))];
  return { title, body, link: rawLink || null, gymIds, email: input.email === true };
}

/** ¿Este aviso le toca a este gimnasio? (sin gimnasios elegidos = a todos) */
export const noticeAppliesTo = (notice: { gymIds: string[] }, gymId: string): boolean => notice.gymIds.length === 0 || notice.gymIds.includes(gymId);
