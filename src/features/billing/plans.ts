import 'server-only';
import type { EntitlementTier } from '@prisma/client';
import type { Feature } from '@/server/entitlements';
import { type PlanDuration } from './plan-durations';

/**
 * Metadata de marketing de los planes (precio, orden). La habilitación real de
 * cada feature sigue viviendo SOLO en `TIER_LIMITS`/`TRIAL_LIMITS`
 * (`@/server/entitlements`) — acá no se duplica, se lee de ahí, para que esta
 * pantalla nunca prometa algo que el resto de la app no cumple.
 *
 * Los precios deben coincidir con los productos configurados en RevenueCat
 * (offering `default`, Test Store): identificador de producto
 * `{tier}_{duration}` en minúsculas, ej. `pro_6month`. BASIC es un plan de
 * entrada sin variantes de duración (solo `basic_monthly`).
 */
export const PLAN_ORDER: EntitlementTier[] = ['FREE', 'BASIC', 'PRO', 'COACH'];

/** Único precio de BASIC (sin descuentos por duración). */
export const BASIC_PRICE_USD = 2.99;

/** PRO y COACH sí tienen variantes de duración con descuento (ver plan-durations.ts). */
export const PLAN_PRICE_USD: Record<'PRO' | 'COACH', Record<PlanDuration, number>> = {
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
