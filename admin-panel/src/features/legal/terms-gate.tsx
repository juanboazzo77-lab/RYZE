'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/brand';
import { GymTerms, TERMS_DATE } from './gym-terms';
import { acceptTermsAction } from './terms-actions';

/** Pantalla que el dueño ve hasta que acepta los términos para gimnasios (los gimnasios nuevos los aceptan al pedir el alta). */
export function TermsGate({ gymName }: { gymName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [checked, setChecked] = useState(false);

  function accept() {
    start(async () => {
      const res = await acceptTermsAction();
      if (res.ok) router.refresh();
      else toast.error('No se pudo guardar. Probá de nuevo.');
    });
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <div className="flex items-center gap-3">
        <BrandMark size={44} />
        <div>
          <h1 className="text-xl font-bold tracking-tight">Términos para gimnasios</h1>
          <p className="text-xs text-muted-foreground">
            {gymName} · actualizados el {TERMS_DATE}
          </p>
        </div>
      </div>
      <p className="mt-4 rounded-lg bg-accent p-3 text-sm">Para seguir usando el panel, leé y aceptá los términos de abajo.</p>
      <GymTerms />
      <div className="sticky bottom-0 mt-8 space-y-3 border-t bg-background py-4">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 size-4 shrink-0" />
          <span>Leí y acepto los términos y condiciones para gimnasios, en nombre de {gymName}.</span>
        </label>
        <Button className="w-full" disabled={!checked || pending} onClick={accept}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Aceptar y entrar al panel
        </Button>
      </div>
    </div>
  );
}
