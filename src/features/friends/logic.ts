/** Lógica pura de amigos e invitaciones (sin base de datos), para poder testearla. */

/** Sin 0/O/1/I/L: el código se dicta y se escribe a mano. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

export function generateCode(random: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) out += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return out;
}

/** Deja el código como se guarda: mayúsculas, sin espacios ni guiones. Vacío si no tiene forma de código. */
export function normalizeCode(raw: string): string {
  const code = raw.toUpperCase().replace(/[\s-]/g, '');
  return code.length >= 4 && code.length <= 12 && /^[A-Z0-9]+$/.test(code) ? code : '';
}

export interface FriendStats {
  id: string;
  name: string;
  isMe: boolean;
  weekWorkouts: number;
  streak: number;
}

/** Más entrenos en la semana primero; a igual cantidad, la racha más larga; después el nombre. */
export function rankFriends(rows: FriendStats[]): FriendStats[] {
  return [...rows].sort(
    (a, b) =>
      b.weekWorkouts - a.weekWorkouts ||
      b.streak - a.streak ||
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}
