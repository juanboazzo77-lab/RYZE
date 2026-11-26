import 'server-only';
import { prisma } from '@/server/db';
import { hasActiveWebPlan } from '@/server/billing/mercadopago';
import { effectiveEntitlement } from '@/server/effective-entitlement';
import { can, trialEndsAt } from '@/server/entitlements';
import { getMemberGym } from '@/server/gyms';
import type { AppData } from '@/lib/sync/data';

/** Qué funciones del plan puede ver la app sin señal. Se calcula acá, nunca en el teléfono. */
export async function mobileAccess(userId: string): Promise<AppData['access']> {
  const [profile, entitlement, gym, webPlan] = await Promise.all([
    prisma.profile.findUnique({ where: { id: userId }, select: { email: true } }),
    prisma.entitlement.findUnique({ where: { userId } }),
    getMemberGym(userId),
    hasActiveWebPlan(userId),
  ]);
  if (!profile || !entitlement) return { advancedStats: false, until: null };
  const effective = effectiveEntitlement(profile.email, entitlement, gym, webPlan);
  // Si lo tiene por la prueba gratis, sin señal también se tiene que terminar a su hora.
  return { advancedStats: can(effective, 'advanced_stats'), until: trialEndsAt(effective)?.toISOString() ?? null };
}
