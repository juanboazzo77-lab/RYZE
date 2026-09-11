import 'server-only';
import type { Entitlement, EntitlementTier } from '@prisma/client';

/**
 * Modelo freemium de 3 planes. La fuente de verdad de qué puede hacer cada
 * tier vive acá. Sin pagos en v1: todos arrancan en FREE; el upgrade se hará
 * con Stripe (la tabla `entitlement` ya tiene los campos `stripe_*`).
 *
 * COACH es el plan más top: todo lo de PRO + el perfil de coaching
 * (`src/features/coach-profile`) y la individualización 100% a medida que la
 * IA arma a partir de esos datos (`coach_profile`, ver `buildUserContextBlock`).
 */

export type Feature =
  | 'ai_coach_message'
  | 'ai_generate_plan'
  | 'ai_meal_plan'
  | 'weekly_checkin'
  | 'advanced_stats'
  | 'progression_analysis'
  | 'coach_profile';

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
      coach_profile: false,
    },
  },
  PRO: {
    aiCoachMessagesPerDay: 100,
    aiPlansPerMonth: 10,
    features: {
      ai_coach_message: true,
      ai_generate_plan: true,
      ai_meal_plan: true,
      weekly_checkin: true,
      advanced_stats: true,
      progression_analysis: true,
      coach_profile: false,
    },
  },
  COACH: {
    aiCoachMessagesPerDay: 200,
    aiPlansPerMonth: 30,
    features: {
      ai_coach_message: true,
      ai_generate_plan: true,
      ai_meal_plan: true,
      weekly_checkin: true,
      advanced_stats: true,
      progression_analysis: true,
      coach_profile: true,
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
