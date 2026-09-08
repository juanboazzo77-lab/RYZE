import 'server-only';
import type { Entitlement, EntitlementTier } from '@prisma/client';

/**
 * Modelo freemium. La fuente de verdad de qué puede hacer cada tier vive acá.
 * Sin pagos en v1: todos arrancan en FREE; el upgrade a PRO se hará con Stripe
 * (la tabla `entitlement` ya tiene los campos `stripe_*`).
 */

export type Feature =
  | 'ai_coach_message'
  | 'ai_generate_plan'
  | 'ai_meal_plan'
  | 'weekly_checkin'
  | 'advanced_stats'
  | 'progression_analysis';

export interface TierLimits {
  /** Mensajes/día con el AI Coach. `Infinity` = sin límite. */
  aiCoachMessagesPerDay: number;
  /** Generaciones de plan con IA por mes. */
  aiPlansPerMonth: number;
  features: Record<Feature, boolean>;
}

export const TIER_LIMITS: Record<EntitlementTier, TierLimits> = {
  FREE: {
    aiCoachMessagesPerDay: 5,
    aiPlansPerMonth: 1,
    features: {
      ai_coach_message: true,
      ai_generate_plan: true,
      ai_meal_plan: false,
      weekly_checkin: false,
      advanced_stats: false,
      progression_analysis: false,
    },
  },
  PRO: {
    aiCoachMessagesPerDay: 200,
    aiPlansPerMonth: 30,
    features: {
      ai_coach_message: true,
      ai_generate_plan: true,
      ai_meal_plan: true,
      weekly_checkin: true,
      advanced_stats: true,
      progression_analysis: true,
    },
  },
};

export function limitsFor(entitlement: Pick<Entitlement, 'tier'>): TierLimits {
  return TIER_LIMITS[entitlement.tier];
}

/** ¿El tier del usuario habilita esta feature? (no chequea límites de uso). */
export function can(entitlement: Pick<Entitlement, 'tier'>, feature: Feature): boolean {
  return TIER_LIMITS[entitlement.tier].features[feature];
}
