'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/**
 * Botón "Elegir plan" para PRO/COACH mientras no haya cobros conectados
 * (Stripe web / Google Play Billing / Apple StoreKit según la plataforma).
 * No otorga el plan: sólo avisa. Evita auto-upgrades gratis y no promete un
 * cobro que todavía no existe.
 */
export function PlanSelectButton({
  label,
  comingSoonMessage,
  variant = 'outline',
}: {
  label: string;
  comingSoonMessage: string;
  variant?: 'default' | 'outline';
}) {
  return (
    <Button
      type="button"
      variant={variant}
      className="w-full"
      onClick={() => toast.message(comingSoonMessage)}
    >
      {label}
    </Button>
  );
}
