'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { createBillingPortalAction } from './actions';

/**
 * Solo tiene sentido en web y solo si el usuario ya tiene una suscripción de
 * Lemon Squeezy (compró alguna vez desde acá) — en la app nativa, o si nunca
 * compró por acá, la suscripción se gestiona desde Apple/Google.
 */
export function ManageBillingButton({
  hasSubscription,
  label,
  openingLabel,
  errorMessage,
}: {
  hasSubscription: boolean;
  label: string;
  openingLabel: string;
  errorMessage: string;
}) {
  const [loading, setLoading] = useState(false);

  if (Capacitor.isNativePlatform() || !hasSubscription) return null;

  async function handleClick() {
    setLoading(true);
    try {
      const res = await createBillingPortalAction();
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      toast.error(errorMessage);
    } catch {
      toast.error(errorMessage);
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
      {loading ? openingLabel : label}
    </button>
  );
}
