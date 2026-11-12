'use client';

import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { activateGymPlan, type ActivationState } from './web-activation-actions';
import { isFullName } from './full-name';

/** Botón "Activar mi plan" de la página del gimnasio: lleva a pagar la suscripción mensual. */
export function ActivatePlanForm({ code, gymName, priceLabel, currentName }: { code: string; gymName: string; priceLabel: string; currentName: string | null }) {
  const [state, action, pending] = useActionState<ActivationState, FormData>(activateGymPlan, {});
  const needsName = !isFullName(currentName);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="code" value={code} />
      {/* Nombre y apellido: así el gimnasio sabe quién sos y puede asignarte tu plan. Si la cuenta ya lo tiene, no se pide. */}
      <label className="block space-y-1 text-left">
        <span className="block text-sm font-medium">Tu número de WhatsApp</span>
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" required minLength={8} maxLength={30} placeholder="11 5555 1234" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-base" />
        <span className="block text-xs text-muted-foreground">{gymName} te identifica con tu número, así sabe quién sos y te asigna tu plan.</span>
      </label>
      {needsName ? (
        <label className="block space-y-1 text-left">
          <span className="block text-sm font-medium">Tu nombre y apellido</span>
          <input name="fullName" defaultValue={currentName && !/@/.test(currentName) ? currentName : ''} autoComplete="name" required minLength={5} maxLength={80} placeholder="Ana Pérez" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-base" />
          <span className="block text-xs text-muted-foreground">{gymName} lo usa para saber quién sos y asignarte tu plan.</span>
        </label>
      ) : null}
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
      {state.error === 'PHONE' ? <p className="text-sm text-destructive">Escribí tu número de WhatsApp con el código de área (por ejemplo, 11 5555 1234).</p> : null}
      {state.error === 'NAME' ? <p className="text-sm text-destructive">Escribí tu nombre y apellido completos (por ejemplo, Ana Pérez).</p> : null}
      {state.error === 'FAILED' ? <p className="text-sm text-destructive">No pudimos iniciar el pago. Probá de nuevo en unos minutos.</p> : null}
      {state.error === 'ALREADY_ACTIVE' ? <p className="text-sm text-muted-foreground">Tu plan ya está activo.</p> : null}
      {state.error === 'NOT_FOUND' ? <p className="text-sm text-destructive">Este gimnasio ya no está disponible.</p> : null}
    </form>
  );
}
