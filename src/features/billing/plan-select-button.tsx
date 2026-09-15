'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getCurrentOfferingPackages, purchasePackage } from './purchases-client';
import { syncMyEntitlementAction } from './actions';
import type { PlanDuration } from './plan-durations';

/**
 * Botón "Elegir plan" para PRO/COACH. Nativo (Capacitor): compra real vía
 * RevenueCat (StoreKit/Play Billing) contra el paquete `{tier}_{duration}` del
 * offering `default`. Web: no hay tienda con la que hablar — solo avisa que
 * hay que abrir la app instalada.
 */
export function PlanSelectButton({
  tier,
  duration,
  label,
  comingSoonMessage,
  purchasingLabel,
  successMessage,
  errorMessage,
  variant = 'outline',
}: {
  tier: 'PRO' | 'COACH';
  duration: PlanDuration;
  label: string;
  comingSoonMessage: string;
  purchasingLabel: string;
  successMessage: string;
  errorMessage: string;
  variant?: 'default' | 'outline';
}) {
  const [loading, setLoading] = useState(false);
  const packageId = `${tier.toLowerCase()}_${duration}`;

  async function handleClick() {
    if (!Capacitor.isNativePlatform()) {
      toast.message(comingSoonMessage);
      return;
    }
    setLoading(true);
    try {
      const packages = await getCurrentOfferingPackages();
      const pkg = packages.find((p) => p.identifier === packageId);
      if (!pkg) {
        toast.error(errorMessage);
        return;
      }
      await purchasePackage(pkg);
      await syncMyEntitlementAction();
      toast.success(successMessage);
    } catch (e) {
      if (!(e as { userCancelled?: boolean }).userCancelled) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant={variant} className="w-full" disabled={loading} onClick={handleClick}>
      {loading ? purchasingLabel : label}
    </Button>
  );
}
