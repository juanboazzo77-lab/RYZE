import type { Entitlement } from '@prisma/client';
import { memberHasGymAccess } from '@/features/gym/trial';
import { withFullAccess, withGymAccess } from './entitlements';

/**
 * El acceso que de verdad tiene una persona. La web y la app usan esta misma regla: un socio de gimnasio y quien paga el
 * plan mensual por la web tienen el mismo acceso. Quien entró con el código sólo lo tiene durante su prueba; después
 * tiene que pagar su plan. Las cuentas propias de acceso completo ven todo.
 */
export function effectiveEntitlement(
  email: string,
  entitlement: Entitlement,
  gym: { source: string; trialEndsAt: Date | null } | null,
  webPlan: boolean,
): Entitlement & { gymAccess?: boolean } {
  return withFullAccess(email, (gym && memberHasGymAccess(gym)) || webPlan ? withGymAccess(entitlement) : entitlement);
}
