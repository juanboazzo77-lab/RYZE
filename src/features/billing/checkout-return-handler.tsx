'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Al volver de Lemon Squeezy Checkout (`?ls=success|cancel`), refresca la
 * página un par de veces para darle tiempo al webhook (server-to-server,
 * suele tardar pocos segundos) a actualizar el entitlement, y limpia la URL.
 * Sin UI propia.
 */
export function CheckoutReturnHandler({
  successMessage,
  cancelMessage,
}: {
  successMessage: string;
  cancelMessage?: string;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const status = params.get('ls');
    if (!status) return;
    handled.current = true;

    if (status === 'success') {
      toast.success(successMessage);
      router.refresh();
      const t = setTimeout(() => {
        router.refresh();
        router.replace('/settings/plans');
      }, 3000);
      return () => clearTimeout(t);
    }
    if (status === 'cancel' && cancelMessage) {
      toast.message(cancelMessage);
    }
    router.replace('/settings/plans');
  }, [params, router, successMessage, cancelMessage]);

  return null;
}
