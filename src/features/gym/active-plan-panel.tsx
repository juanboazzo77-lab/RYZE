'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { cancelMyWebPlan, setWebShareActivity } from './web-activation-actions';

/**
 * Lo que ve quien ya tiene su plan activo en la página del gimnasio: si deja que el gimnasio vea su nombre y su
 * actividad (apagado por defecto) y cómo cancelar el plan.
 */
export function ActivePlanPanel({ code, gymName, initialShare }: { code: string; gymName: string; initialShare: boolean }) {
  const [share, setShare] = useState(initialShare);
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(false);

  function toggle(next: boolean) {
    setShare(next);
    start(async () => {
      const res = await setWebShareActivity(next);
      if (!res.ok) setShare(!next);
    });
  }

  function cancel() {
    setError(false);
    start(async () => {
      const res = await cancelMyWebPlan(code);
      if (!res.ok) setError(true);
      else window.location.reload();
    });
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <label className="flex cursor-pointer items-start gap-3 text-left text-sm">
        <input type="checkbox" className="mt-1 size-4" checked={share} onChange={(e) => toggle(e.target.checked)} />
        <span>
          <span className="block font-medium">Dejar que {gymName} vea mi nombre y cuándo entrené por última vez</span>
          <span className="block text-xs text-muted-foreground">Así tu gimnasio puede ayudarte si te alejás. Nunca ve tu peso, tus fotos ni tus comidas. Lo podés cambiar cuando quieras.</span>
        </span>
      </label>

      <div className="space-y-2 text-center">
        {confirming ? (
          <div className="space-y-2 rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">
            <p>¿Cancelar tu plan? Dejás de pagar y perdés el acceso a tu plan y a las clases, retos y rutinas de {gymName}.</p>
            <div className="flex justify-center gap-2">
              <button type="button" onClick={cancel} disabled={pending} className="inline-flex h-9 items-center gap-1 rounded-full bg-destructive px-4 text-sm font-semibold text-destructive-foreground disabled:opacity-60">
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Sí, cancelar
              </button>
              <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="inline-flex h-9 items-center rounded-full border px-4 text-sm">
                No, mantener
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="text-xs text-muted-foreground underline hover:text-foreground">
            Cancelar mi plan
          </button>
        )}
        {error ? <p className="text-sm text-destructive">No pudimos cancelarlo. Probá de nuevo o cancelalo desde tu cuenta de Mercado Pago.</p> : null}
      </div>
    </div>
  );
}
