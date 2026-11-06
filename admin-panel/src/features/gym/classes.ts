/**
 * Clases del gimnasio con reserva. Cada clase se repite todos los días de la semana que elija el gimnasio, a la
 * misma hora. El socio reserva hasta 7 días hacia adelante y puede cancelar hasta 2 horas antes. Hay una copia de
 * este archivo en admin-panel/src/features/gym/classes.ts (el panel es un sitio aparte): si cambia uno, cambiar el otro.
 *
 * Los horarios son de Argentina (UTC-3, sin horario de verano).
 */

export const CANCEL_BEFORE_MINUTES = 120;
export const BOOKING_DAYS_AHEAD = 7;
export const MAX_CLASSES_PER_GYM = 60;
const AR_OFFSET_HOURS = 3;
const MS_MIN = 60 * 1000;
const MS_DAY = 24 * 60 * 60 * 1000;

/** 1 = lunes … 7 = domingo. */
export const WEEKDAYS: Array<{ n: number; label: string; short: string }> = [
  { n: 1, label: 'Lunes', short: 'Lun' },
  { n: 2, label: 'Martes', short: 'Mar' },
  { n: 3, label: 'Miércoles', short: 'Mié' },
  { n: 4, label: 'Jueves', short: 'Jue' },
  { n: 5, label: 'Viernes', short: 'Vie' },
  { n: 6, label: 'Sábado', short: 'Sáb' },
  { n: 7, label: 'Domingo', short: 'Dom' },
];
export const weekdayLabel = (n: number): string => WEEKDAYS.find((w) => w.n === n)?.label ?? '';

export const isHHMM = (v: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
export const isISODate = (v: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(toMs(v));
export const addDays = (iso: string, n: number): string => new Date(toMs(iso) + n * MS_DAY).toISOString().slice(0, 10);

/** Día de la semana ISO (1 = lunes … 7 = domingo) de una fecha yyyy-mm-dd. */
export function weekdayOf(iso: string): number {
  const d = new Date(toMs(iso)).getUTCDay(); // 0 = domingo
  return d === 0 ? 7 : d;
}

/** El instante en que empieza una clase ese día (hora de Argentina). */
export function startInstant(dateISO: string, time: string): Date {
  const [h, m] = time.split(':').map(Number) as [number, number];
  return new Date(toMs(dateISO) + (h + AR_OFFSET_HOURS) * 60 * MS_MIN + m * MS_MIN);
}

/** Fecha local de Argentina (yyyy-mm-dd) de un instante. */
export function todayAR(now: Date): string {
  return new Date(now.getTime() - AR_OFFSET_HOURS * 60 * MS_MIN).toISOString().slice(0, 10);
}

export interface ClassSlot {
  id: string;
  weekday: number;
  /** HH:MM */
  startTime: string;
  durationMin: number;
  capacity: number;
}

export interface Occurrence<T extends ClassSlot = ClassSlot> {
  slot: T;
  date: string;
  startsAt: Date;
}

/** Las clases que vienen en los próximos días (hoy incluido), de la más próxima a la más lejana. Las que ya empezaron no entran. */
export function upcomingOccurrences<T extends ClassSlot>(slots: T[], now: Date, daysAhead = BOOKING_DAYS_AHEAD): Array<Occurrence<T>> {
  const today = todayAR(now);
  const out: Array<Occurrence<T>> = [];
  for (let i = 0; i < daysAhead; i += 1) {
    const date = addDays(today, i);
    const wd = weekdayOf(date);
    for (const slot of slots) {
      if (slot.weekday !== wd) continue;
      const startsAt = startInstant(date, slot.startTime);
      if (startsAt.getTime() > now.getTime()) out.push({ slot, date, startsAt });
    }
  }
  return out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export type BookingState = 'BOOKABLE' | 'FULL' | 'STARTED' | 'MINE' | 'MINE_LOCKED';

/** Qué puede hacer el socio con esta clase. MINE = la tiene reservada y todavía puede cancelar; MINE_LOCKED = faltan menos de 2 horas. */
export function bookingState(args: { now: Date; startsAt: Date; capacity: number; booked: number; mine: boolean }): BookingState {
  const { now, startsAt, capacity, booked, mine } = args;
  if (mine) return startsAt.getTime() - now.getTime() >= CANCEL_BEFORE_MINUTES * MS_MIN ? 'MINE' : 'MINE_LOCKED';
  if (startsAt.getTime() <= now.getTime()) return 'STARTED';
  return booked >= capacity ? 'FULL' : 'BOOKABLE';
}

/** ¿Todavía se puede cancelar? (hasta 2 horas antes del comienzo) */
export const canCancel = (now: Date, startsAt: Date): boolean => startsAt.getTime() - now.getTime() >= CANCEL_BEFORE_MINUTES * MS_MIN;

/** ¿Esa fecha cae dentro de la ventana en que se puede reservar? */
export function withinBookingWindow(dateISO: string, now: Date): boolean {
  if (!isISODate(dateISO)) return false;
  const today = todayAR(now);
  return dateISO >= today && dateISO <= addDays(today, BOOKING_DAYS_AHEAD - 1);
}

/** "19:00 a 20:00" */
export function timeRange(startTime: string, durationMin: number): string {
  const [h, m] = startTime.split(':').map(Number) as [number, number];
  const end = h * 60 + m + durationMin;
  const hh = String(Math.floor(end / 60) % 24).padStart(2, '0');
  const mm = String(end % 60).padStart(2, '0');
  return `${startTime} a ${hh}:${mm}`;
}

const clip = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export interface ClassInput {
  name: string;
  description: string;
  instructor: string;
  weekdays: number[];
  startTime: string;
  durationMin: number;
  capacity: number;
}

/** Valida lo que carga el dueño: nombre, al menos un día, hora, duración y cupo razonables. */
export function cleanClass(input: { name?: unknown; description?: unknown; instructor?: unknown; weekdays?: unknown; startTime?: unknown; durationMin?: unknown; capacity?: unknown }): ClassInput | { error: 'NAME' | 'WEEKDAYS' | 'TIME' | 'DURATION' | 'CAPACITY' } {
  const name = clip(input.name, 60);
  if (name.length < 2) return { error: 'NAME' };
  const weekdays = [...new Set((Array.isArray(input.weekdays) ? input.weekdays : []).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 7))].sort((a, b) => a - b);
  if (weekdays.length === 0) return { error: 'WEEKDAYS' };
  const startTime = typeof input.startTime === 'string' ? input.startTime : '';
  if (!isHHMM(startTime)) return { error: 'TIME' };
  const durationMin = Math.round(Number(input.durationMin));
  if (!Number.isFinite(durationMin) || durationMin < 15 || durationMin > 180) return { error: 'DURATION' };
  const capacity = Math.round(Number(input.capacity));
  if (!Number.isFinite(capacity) || capacity < 1 || capacity > 200) return { error: 'CAPACITY' };
  return { name, description: clip(input.description, 200), instructor: clip(input.instructor, 60), weekdays, startTime, durationMin, capacity };
}
