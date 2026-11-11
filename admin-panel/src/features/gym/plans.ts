import { addDays, isISODate, weekdayOf } from './classes';

/**
 * Planes de pago de un gimnasio (por ejemplo "Pase libre" o "3 veces por semana") y qué puede hacer cada cliente según el
 * suyo: a qué tipos de clase se puede anotar y cuántas reservas por semana. Si el gimnasio no tiene planes, o el cliente
 * no tiene uno asignado, no hay restricciones. Hay una copia de este archivo en admin-panel/src/features/gym/plans.ts (el
 * panel es un sitio aparte): si cambia uno, cambiar el otro.
 */

export const MAX_PLANS_PER_GYM = 12;
export const MAX_WEEKLY_LIMIT = 21;

export type ClassesMode = 'ALL' | 'SELECTED';

/** Lo que hace falta de un plan para decidir si una reserva se puede hacer. */
export interface PlanRule {
  classesMode: ClassesMode;
  /** Nombres (tipos) de clase incluidos; solo cuentan cuando classesMode es SELECTED. */
  classNames: string[];
  /** Reservas por semana (lunes a domingo). null = sin límite. */
  weeklyLimit: number | null;
}

export const asClassesMode = (v: string): ClassesMode => (v === 'SELECTED' ? 'SELECTED' : 'ALL');

/** Los nombres de clase se comparan sin importar mayúsculas ni espacios de más. */
export const normClassName = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, ' ');

/** ¿Este plan incluye esta clase? Sin plan (null), todas. */
export function planAllowsClass(plan: PlanRule | null, className: string): boolean {
  if (!plan || plan.classesMode === 'ALL') return true;
  const wanted = normClassName(className);
  return plan.classNames.some((n) => normClassName(n) === wanted);
}

/** El lunes y el domingo de la semana de una fecha (yyyy-mm-dd). */
export function weekBounds(dateISO: string): { start: string; end: string } {
  const start = addDays(dateISO, -(weekdayOf(dateISO) - 1));
  return { start, end: addDays(start, 6) };
}

/** ¿Ya usó todas las reservas de la semana que le da el plan? */
export function weeklyLimitReached(plan: PlanRule | null, bookedThisWeek: number): boolean {
  return Boolean(plan && plan.weeklyLimit !== null && bookedThisWeek >= plan.weeklyLimit);
}

/** Resumen corto de lo que da un plan, para mostrar en pantalla. */
export function describePlan(plan: PlanRule): { classes: string; weekly: string } {
  return {
    classes: plan.classesMode === 'ALL' ? 'Todas las clases' : plan.classNames.length > 0 ? `Solo: ${plan.classNames.join(', ')}` : 'Ninguna clase',
    weekly: plan.weeklyLimit === null ? 'Reservas sin límite' : `${plan.weeklyLimit} ${plan.weeklyLimit === 1 ? 'reserva' : 'reservas'} por semana`,
  };
}

const clip = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export interface PlanInput {
  name: string;
  description: string;
  price: number | null;
  classesMode: ClassesMode;
  classNames: string[];
  weeklyLimit: number | null;
}

/** Valida lo que carga el dueño: nombre, precio, qué clases incluye y las reservas por semana. */
export function cleanPlan(input: {
  name?: unknown;
  description?: unknown;
  price?: unknown;
  classesMode?: unknown;
  classNames?: unknown;
  weeklyLimit?: unknown;
}): PlanInput | { error: 'NAME' | 'PRICE' | 'CLASSES' | 'LIMIT' } {
  const name = clip(input.name, 60);
  if (name.length < 2) return { error: 'NAME' };

  let price: number | null = null;
  if (input.price !== null && input.price !== undefined && String(input.price).trim() !== '') {
    const n = Number(String(input.price).replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || n > 10_000_000) return { error: 'PRICE' };
    price = Math.round(n * 100) / 100;
  }

  const classesMode = asClassesMode(String(input.classesMode ?? 'ALL'));
  const seen = new Set<string>();
  const classNames: string[] = [];
  for (const raw of Array.isArray(input.classNames) ? input.classNames : []) {
    const n = clip(raw, 60);
    const key = normClassName(n);
    if (!n || seen.has(key)) continue;
    seen.add(key);
    classNames.push(n);
    if (classNames.length >= 30) break;
  }
  if (classesMode === 'SELECTED' && classNames.length === 0) return { error: 'CLASSES' };

  let weeklyLimit: number | null = null;
  if (input.weeklyLimit !== null && input.weeklyLimit !== undefined && String(input.weeklyLimit).trim() !== '') {
    const n = Math.round(Number(input.weeklyLimit));
    if (!Number.isFinite(n) || n < 1 || n > MAX_WEEKLY_LIMIT) return { error: 'LIMIT' };
    weeklyLimit = n;
  }

  return { name, description: clip(input.description, 200), price, classesMode, classNames: classesMode === 'ALL' ? [] : classNames, weeklyLimit };
}

export { isISODate };
