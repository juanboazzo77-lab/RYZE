/**
 * Cuotas de los clientes de un gimnasio: lógica pura, sin base de datos. Las fechas son "YYYY-MM-DD" (día
 * calendario de Argentina). Hay una copia de este archivo en admin-panel/src/features/gym/fees.ts (el panel de
 * gestión es un sitio aparte): si cambia acá, cambiarlo allá también.
 */

/** Días después del vencimiento en que el cliente todavía conserva Forza AI antes de perder el acceso. */
export const GRACE_DAYS = 5;
/** Con cuántos días de anticipación se avisa que una cuota está por vencer. */
export const SOON_DAYS = 7;

export type FeeStatus = 'NEW' | 'OK' | 'SOON' | 'DUE_TODAY' | 'OVERDUE' | 'LAPSED';

const MS_DAY = 24 * 60 * 60 * 1000;
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function isISODate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(toMs(v));
}

/** Días enteros de `a` a `b` (positivo si `b` es posterior). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toMs(b) - toMs(a)) / MS_DAY);
}

export function addDays(iso: string, days: number): string {
  return new Date(toMs(iso) + days * MS_DAY).toISOString().slice(0, 10);
}

/** Suma meses calendario; si el día no existe en el mes de destino queda el último (31 de enero + 1 = 28/29 de febrero). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

/**
 * Hasta cuándo queda pagado un cliente después de un pago. Si pagó a tiempo (antes o el día del vencimiento) el
 * mes nuevo se cuenta desde el vencimiento anterior; si pagó tarde o es la primera vez, desde el día del pago.
 */
export function nextPaidUntil(paidUntil: string | null, paidOn: string, months = 1): string {
  const base = paidUntil && paidUntil >= paidOn ? paidUntil : paidOn;
  return addMonths(base, months);
}

/**
 * Estado de la cuota. `paidUntil` es el día en que vence (el día que le toca volver a pagar). Sin fecha cargada
 * es un cliente nuevo todavía sin cuota controlada.
 */
export function feeStatus(paidUntil: string | null, today: string, grace = GRACE_DAYS): FeeStatus {
  if (!paidUntil) return 'NEW';
  const d = daysBetween(today, paidUntil); // días que faltan
  if (d > SOON_DAYS) return 'OK';
  if (d > 0) return 'SOON';
  if (d === 0) return 'DUE_TODAY';
  return -d > grace ? 'LAPSED' : 'OVERDUE';
}

export const FEE_LABEL: Record<FeeStatus, string> = {
  NEW: 'Sin fecha',
  OK: 'Al día',
  SOON: 'Vence pronto',
  DUE_TODAY: 'Vence hoy',
  OVERDUE: 'Vencida',
  LAPSED: 'Sin acceso a Forza AI',
};

/** Ordena para trabajar: primero lo que hay que cobrar ya. */
export function feeRank(s: FeeStatus): number {
  return { LAPSED: 0, OVERDUE: 1, DUE_TODAY: 2, SOON: 3, NEW: 4, OK: 5 }[s];
}

/** Un teléfono tiene símbolos (+, espacios, guiones, paréntesis) o 8 dígitos o más seguidos. */
function looksLikePhone(p: string): boolean {
  if (!/^[+\d][\d\s().-]*$/.test(p)) return false;
  const digits = p.replace(/\D/g, '').length;
  if (digits < 7) return false;
  return /[+\s().-]/.test(p) || digits >= 8;
}

/** Un monto: 15000, 15.000, 15000,50 o $15000. Devuelve null si no lo es. */
function parseAmount(p: string): number | null {
  const t = p.replace(/[$\s]/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return Number(t.replace(/\./g, '').replace(',', '.'));
  if (/^\d+([.,]\d+)?$/.test(t)) return Number(t.replace(',', '.'));
  return null;
}

export interface ClientLine {
  name: string;
  email: string | null;
  phone: string | null;
  fee: number | null;
  /** Fecha de vencimiento de la cuota, si la cargaron. */
  paidUntil: string | null;
  /** Nombre del plan de pago del gimnasio ("Plan: Pase libre"), si lo indicaron. */
  plan: string | null;
}

/**
 * Lee una lista pegada de clientes, uno por línea: `Nombre, mail, teléfono, cuota, vencimiento`. Sólo el nombre es
 * obligatorio; el resto va por orden y puede quedar vacío ("Ana Pérez, ana@x.com" o "Luis, , 1155551234").
 * Si una parte parece un mail, un teléfono, un monto o una fecha se acomoda sola.
 */
export function parseClientLines(raw: string): { valid: ClientLine[]; invalid: string[] } {
  const valid: ClientLine[] = [];
  const invalid: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim();
    if (!text) continue;
    const parts = text.split(/[,;\t]/).map((p) => p.trim());
    const name = parts[0] ?? '';
    if (name.length < 2 || /@/.test(name)) {
      invalid.push(text);
      continue;
    }
    const out: ClientLine = { name: name.slice(0, 120), email: null, phone: null, fee: null, paidUntil: null, plan: null };
    let bad = false;
    for (const p of parts.slice(1)) {
      if (!p) continue;
      const planMatch = /^plan\s*[:=]\s*(.+)$/i.exec(p);
      if (planMatch) {
        out.plan = planMatch[1]!.trim().slice(0, 60);
      } else if (/@/.test(p)) {
        const e = p.toLowerCase();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) out.email = e;
        else bad = true;
      } else if (isISODate(p)) out.paidUntil = p;
      else if (/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.test(p)) {
        const [, dd, mm, yy] = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(p)!;
        const iso = `${yy}-${mm!.padStart(2, '0')}-${dd!.padStart(2, '0')}`;
        if (isISODate(iso)) out.paidUntil = iso;
        else bad = true;
      } else if (looksLikePhone(p)) {
        out.phone = p.replace(/\s+/g, ' ').slice(0, 40);
      } else if (parseAmount(p) !== null) {
        out.fee = parseAmount(p);
      } else {
        bad = true;
      }
    }
    if (bad) invalid.push(text);
    else valid.push(out);
  }
  return { valid, invalid };
}
