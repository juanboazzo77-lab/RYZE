'use client';

import { useEffect } from 'react';
import { configurePurchases } from './purchases-client';

/** Configura el SDK de RevenueCat con el usuario logueado. Sin UI. */
export function RevenueCatInit({ userId }: { userId: string }) {
  useEffect(() => {
    configurePurchases(userId).catch((e) => console.error('[revenuecat] configure falló', e));
  }, [userId]);

  return null;
}
