import 'server-only';
import type { EntitlementTier } from '@prisma/client';
import type { Feature } from '@/server/entitlements';
import { type PlanDuration } from './plan-durations';

/**
 * Metadata de marketing de los planes (precio, orden). La habilitación real de
 * cada feature sigue viviendo SOLO en `TIER_LIMITS` (`@/server/entitlements`)
 * — acá no se duplica, se lee de ahí, para que esta pantalla nunca prometa algo
 * que el resto de la app no cumple.
 *
 * Los precios deben coincidir con los productos configurados en RevenueCat
 * (offering `default`, Test Store): identificador de producto
 * `{tier}_{duration}` en minúsculas, ej. `pro_6month`.
 */
export const PLAN_ORDER: EntitlementTier[] = ['FREE', 'PRO', 'COACH'];

export const PLAN_PRICE_USD: Record<EntitlementTier, Record<PlanDuration, number>> = {
  FREE: { monthly: 0, '3month': 0, '6month': 0, '12month': 0 },
  PRO: { monthly: 9.99, '3month': 26.99, '6month': 47.99, '12month': 71.99 },
  COACH: { monthly: 19.99, '3month': 53.99, '6month': 95.99, '12month': 143.99 },
};

/** Filas de la comparativa además de los límites numéricos de IA. */
export const FEATURE_ROWS = [
  'ai_meal_plan',
  'weekly_checkin',
  'advanced_stats',
  'progression_analysis',
  'coach_profile',
] as const satisfies readonly Feature[];
