'use client';

import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { activateGymPlan, type ActivationState } from './web-activation-actions';

/** Botón "Activar mi plan" de la página del gimnasio: lleva a pagar la suscripción mensual. */
export function ActivatePlanForm({ code, gymName, priceLabel }: { code: string; gymName: string; priceLabel: string }) {
  const [state, action, pending] = useActionState<ActivationState, FormData>(activateGymPlan, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="code" value={code} />
      <Button type="submit" size="lg" className="h-12 w-full rounded-full text-base font-bold" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Activar mi plan · {priceLabel} por mes
      </Button>
      <p className="text-center text-xs text-muted-foreground">Pagás con Mercado Pago y podés cancelar cuando quieras desde tu cuenta de Mercado Pago.</p>
      {state.error === 'NOT_READY' ? (
        <p className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">
          El pago por la web todavía no está habilitado. Guardamos que venís de <strong>{gymName}</strong>: pedile el alta a tu gimnasio o volvé en unos días.
        </p>
      ) : null}
      {state.error === 'FAILED' ? <p className="text-sm text-destructive">No pudimos iniciar el pago. Probá de nuevo en unos minutos.</p> : null}
      {state.error === 'ALREADY_ACTIVE' ? <p className="text-sm text-muted-foreground">Tu plan ya está activo.</p> : null}
      {state.error === 'NOT_FOUND' ? <p className="text-sm text-destructive">Este gimnasio ya no está disponible.</p> : null}
    </form>
  );
}
