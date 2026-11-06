/**
 * Gimnasios: lógica pura, sin base de datos.
 */

/** Sin letras y números que se confunden (0/O, 1/I/L). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const GYM_CODE_LENGTH = 8;

export const GYM_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'] as const;
export type GymStatus = (typeof GYM_STATUSES)[number];

export function asGymStatus(value: string): GymStatus {
  return (GYM_STATUSES as readonly string[]).includes(value) ? (value as GymStatus) : 'PENDING';
}

/** Código que el gimnasio le da a sus socios. */
export function generateGymCode(random: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < GYM_CODE_LENGTH; i++) out += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return out;
}

/** Deja el código como se guarda: mayúsculas, sin espacios ni guiones. Vacío si no tiene forma de código. */
export function normalizeGymCode(raw: string): string {
  const code = raw.toUpperCase().replace(/[\s-]/g, '');
  return code.length === GYM_CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c)) ? code : '';
}

/** Muestra el código en dos mitades para leerlo y dictarlo fácil: ABCD-2345. */
export function formatGymCode(code: string): string {
  return code.length === GYM_CODE_LENGTH ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

export type JoinError = 'INVALID_CODE' | 'FULL' | 'ALREADY_MEMBER';

/**
 * ¿Puede entrar un socio más? Sólo con el gimnasio activo y cupo libre. `memberLimit` 0 = todavía sin
 * cupo fijado: no entra nadie.
 */
export function canJoin(args: { status: string; memberLimit: number; activeMembers: number }): JoinError | null {
  if (asGymStatus(args.status) !== 'ACTIVE') return 'INVALID_CODE';
  if (args.activeMembers >= args.memberLimit) return 'FULL';
  return null;
}

/** Cupo usado, de 0 a 100 (sin pasarse aunque haya más socios que cupo por una baja del cupo). */
export function usedPercent(activeMembers: number, memberLimit: number): number {
  if (memberLimit <= 0) return 0;
  return Math.min(100, Math.round((activeMembers / memberLimit) * 100));
}

/** Cantidad de socios que el formulario permite declarar. */
export const MAX_MEMBER_ESTIMATE = 100_000;
/** Cupo máximo que el admin puede fijar de una vez (evita un error de tipeo). */
export const MAX_MEMBER_LIMIT = 20_000;

/* ---------- Invitaciones por mail ---------- */

/** Tope de mails por pedido, para que un error de pegado no cargue miles. */
export const MAX_INVITES_PER_REQUEST = 200;

const EMAIL_RE = /^[^\s@,;<>()]+@[^\s@,;<>()]+\.[^\s@,;<>()]{2,}$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Lee una lista pegada de mails (uno por línea, o separados por coma, punto y coma o espacios; también acepta
 * "Nombre <mail@x.com>"). Devuelve los válidos sin repetir y los que no se entendieron.
 */
export function parseEmailList(raw: string): { valid: string[]; invalid: string[] } {
  const parts = raw
    .split(/[\n\r,;\t ]+/)
    .map((p) => p.replace(/^[^<]*<|>[^>]*$/g, '').trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const p of parts) {
    const e = normalizeEmail(p);
    if (!EMAIL_RE.test(e) || e.length > 200) {
      if (!invalid.includes(p)) invalid.push(p);
      continue;
    }
    if (!seen.has(e)) {
      seen.add(e);
      valid.push(e);
    }
  }
  return { valid, invalid };
}

export type InviteStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'JOINED';

export function asInviteStatus(value: string): InviteStatus {
  return (['PENDING', 'APPROVED', 'REJECTED', 'JOINED'] as const).includes(value as InviteStatus) ? (value as InviteStatus) : 'PENDING';
}

/** Lugares del cupo que ya están tomados: socios adentro más invitaciones aprobadas que todavía no entraron. */
export function reservedSlots(args: { activeMembers: number; approvedInvites: number }): number {
  return args.activeMembers + args.approvedInvites;
}

/** ¿Cuántas invitaciones más se pueden aprobar sin pasarse del cupo? */
export function approvableCount(args: { memberLimit: number; activeMembers: number; approvedInvites: number }): number {
  return Math.max(0, args.memberLimit - reservedSlots(args));
}
