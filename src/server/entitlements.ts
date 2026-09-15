import 'server-only';
import type { Entitlement, EntitlementTier } from '@prisma/client';

/**
 * Modelo freemium de 4 planes. La fuente de verdad de qué puede hacer cada
 * tier vive acá. FREE es una prueba gratis por `TRIAL_DAYS` a partir del alta
 * de la cuenta (`entitlement.createdAt`): durante esos días tiene acceso
 * completo (todo lo de COACH, ver `TRIAL_LIMITS`) para que pueda probar todo
 * a fondo. Pasado ese plazo, si el usuario no pasó a BASIC/PRO/COACH, queda
 * bloqueado del todo para IA (ver `TIER_LIMITS.FREE` y `isInTrial`) — y si sí
 * pagó, se le respeta exactamente lo que le corresponde a ese tier.
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

/** Días de prueba gratis para una cuenta FREE nueva, antes de tener que pagar. */
export const TRIAL_DAYS = 7;

export const TIER_LIMITS: Record<EntitlementTier, TierLimits> = {
  // Terminada la prueba gratis (`TRIAL_LIMITS`), FREE queda bloqueada del todo
  // para IA: hay que pasar a BASIC o superior para seguir usándola.
  FREE: {
    aiCoachMessagesPerDay: 0,
    aiPlansPerMonth: 0,
    features: {
      ai_coach_message: false,
      ai_generate_plan: false,
      ai_meal_plan: false,
      weekly_checkin: false,
      advanced_stats: false,
      progression_analysis: false,
      coach_profile: false,
    },
  },
  BASIC: {
    aiCoachMessagesPerDay: 10,
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
    aiCoachMessagesPerDay: 50,
    aiPlansPerMonth: 5,
    features: {
      ai_coach_message: true,
      ai_generate_plan: true,
      ai_meal_plan: true,
      weekly_checkin: true,
      advanced_stats: false,
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

/**
 * Límites durante la prueba gratis (primeros `TRIAL_DAYS` días de una cuenta
 * FREE): acceso completo, igual que COACH, para que pueda probar todo antes
 * de decidir qué plan pagar.
 */
export const TRIAL_LIMITS: TierLimits = TIER_LIMITS.COACH;

/** ¿La cuenta FREE todavía está dentro de la ventana de prueba gratis? */
export function isInTrial(entitlement: Pick<Entitlement, 'tier' | 'createdAt'>): boolean {
  if (entitlement.tier !== 'FREE') return false;
  const trialEndMs = entitlement.createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() < trialEndMs;
}

/** Días de prueba gratis que le quedan (0 si ya terminó o el tier no es FREE). */
export function trialDaysLeft(entitlement: Pick<Entitlement, 'tier' | 'createdAt'>): number {
  if (entitlement.tier !== 'FREE') return 0;
  const trialEndMs = entitlement.createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((trialEndMs - Date.now()) / (24 * 60 * 60 * 1000)));
}

export function limitsFor(entitlement: Pick<Entitlement, 'tier' | 'createdAt'>): TierLimits {
  if (isInTrial(entitlement)) return TRIAL_LIMITS;
  return TIER_LIMITS[entitlement.tier];
}

/** ¿El tier del usuario habilita esta feature? (no chequea límites de uso). */
export function can(entitlement: Pick<Entitlement, 'tier' | 'createdAt'>, feature: Feature): boolean {
  return limitsFor(entitlement).features[feature];
}

/** Sólo FREE ve publicidad (BASIC/PRO/COACH la sacan, sin importar la prueba). */
export function showAds(entitlement: Pick<Entitlement, 'tier'>): boolean {
  return entitlement.tier === 'FREE';
}
