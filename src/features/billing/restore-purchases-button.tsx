'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { restorePurchases } from './purchases-client';
import { syncMyEntitlementAction } from './actions';

export function RestorePurchasesButton({
  label,
  restoringLabel,
  successMessage,
  nothingFoundMessage,
}: {
  label: string;
  restoringLabel: string;
  successMessage: string;
  nothingFoundMessage: string;
}) {
  const [loading, setLoading] = useState(false);

  if (!Capacitor.isNativePlatform()) return null;

  async function handleClick() {
    setLoading(true);
    try {
      const active = await restorePurchases();
      await syncMyEntitlementAction();
      toast.message(active.length > 0 ? successMessage : nothingFoundMessage);
    } catch {
      toast.message(nothingFoundMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleClick}
      className="mx-auto block text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
    >
      {loading ? restoringLabel : label}
    </button>
  );
}
