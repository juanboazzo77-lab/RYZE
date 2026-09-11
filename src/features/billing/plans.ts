import 'server-only';
import type { EntitlementTier } from '@prisma/client';
import type { Feature } from '@/server/entitlements';

/**
 * Metadata de marketing de los planes (precio, orden). La habilitación real de
 * cada feature sigue viviendo SOLO en `TIER_LIMITS` (`@/server/entitlements`)
 * — acá no se duplica, se lee de ahí, para que esta pantalla nunca prometa algo
 * que el resto de la app no cumple.
 *
 * Sin cobros conectados todavía (ver `PlanSelectButton`): los precios son de
 * referencia para mostrar la comparativa.
 */
export const PLAN_ORDER: EntitlementTier[] = ['FREE', 'PRO', 'COACH'];

export const PLAN_PRICE_USD: Record<EntitlementTier, number> = {
  FREE: 0,
  PRO: 7.99,
  COACH: 12.99,
};

/** Filas de la comparativa además de los límites numéricos de IA. */
export const FEATURE_ROWS = [
  'ai_meal_plan',
  'weekly_checkin',
  'advanced_stats',
  'progression_analysis',
  'coach_profile',
] as const satisfies readonly Feature[];
