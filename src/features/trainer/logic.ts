/**
 * Modo entrenador (piloto): lógica pura, sin base de datos.
 */

/** Sin letras y números que se confunden (0/O, 1/I/L). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 8;

export const TRAINER_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED'] as const;
export type TrainerStatus = (typeof TRAINER_STATUSES)[number];

export function asTrainerStatus(value: string): TrainerStatus {
  return (TRAINER_STATUSES as readonly string[]).includes(value) ? (value as TrainerStatus) : 'PENDING';
}

/** Código que el entrenador le da a sus clientes. */
export function generateInviteCode(random: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) out += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return out;
}

/** Deja el código como se guarda: mayúsculas, sin espacios ni guiones. Vacío si no tiene forma de código. */
export function normalizeInviteCode(raw: string): string {
  const code = raw.toUpperCase().replace(/[\s-]/g, '');
  return code.length === INVITE_CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c)) ? code : '';
}

export type Attention = 'NEW' | 'OK' | 'LATE' | 'INACTIVE';

/** Días enteros entre dos fechas ISO (YYYY-MM-DD); 0 si es el mismo día. */
export function daysBetweenISO(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISO}T00:00:00Z`);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/**
 * Semáforo de un cliente según su última actividad (entrenamiento, comida o peso):
 * hasta 3 días al día, de 4 a 7 atrasado, más de 7 sin actividad. Sin ninguna actividad, "nuevo".
 */
export function attentionLevel(lastActivityISO: string | null, todayISO: string): Attention {
  if (!lastActivityISO) return 'NEW';
  const days = daysBetweenISO(lastActivityISO, todayISO);
  if (days <= 3) return 'OK';
  if (days <= 7) return 'LATE';
  return 'INACTIVE';
}

/** La fecha más reciente entre varias (ISO), ignorando las que faltan. */
export function latestISO(dates: Array<string | null | undefined>): string | null {
  const valid = dates.filter((d): d is string => !!d);
  return valid.length ? valid.reduce((a, b) => (a >= b ? a : b)) : null;
}

/** Cambio de peso entre el primer y el último registro (kg), o null si hay menos de dos. */
export function weightChangeKg(entries: Array<{ date: string; weightKg: number }>): number | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return Math.round((sorted[sorted.length - 1]!.weightKg - sorted[0]!.weightKg) * 10) / 10;
}
