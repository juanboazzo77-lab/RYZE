/**
 * Duraciones de plan y su metadata de marketing. Sin `server-only`: lo usan
 * tanto `plans.ts` (server) como `plan-price-selector.tsx` (client).
 */
export type PlanDuration = 'monthly' | '3month' | '6month' | '12month';

export const PLAN_DURATIONS: PlanDuration[] = ['monthly', '3month', '6month', '12month'];

/** Cuántos meses cubre cada duración (para calcular el equivalente mensual). */
export const PLAN_DURATION_MONTHS: Record<PlanDuration, number> = {
  monthly: 1,
  '3month': 3,
  '6month': 6,
  '12month': 12,
};

/** Descuento de marketing (redondeado) vs. pagar mes a mes al precio monthly. */
export const PLAN_DURATION_DISCOUNT_PCT: Record<PlanDuration, number> = {
  monthly: 0,
  '3month': 10,
  '6month': 20,
  '12month': 40,
};
