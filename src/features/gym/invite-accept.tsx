'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { acceptMyInvite, skipInvite } from './actions';

/** La persona acepta (o deja para después) la invitación de su gimnasio. */
export function InviteAccept({ inviteId, gymName }: { inviteId: string; gymName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [share, setShare] = useState(true);

  function accept() {
    start(async () => {
      const res = await acceptMyInvite({ inviteId, share });
      if (res.ok) {
        toast.success(`¡Listo! Ya sos parte de ${gymName}.`);
        router.push('/dashboard');
        router.refresh();
      } else toast.error('No se pudo aceptar la invitación. Probá de nuevo.');
    });
  }

  function later() {
    start(async () => {
      await skipInvite();
      router.push('/dashboard');
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{gymName} te invita a Forza AI</h1>
        <p className="text-sm text-muted-foreground">Tu gimnasio se hace cargo del costo: para vos es gratis.</p>
      </div>

      <div className="space-y-2 rounded-xl border p-4">
        <p className="text-sm font-medium">Con tu invitación tenés</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Un plan de entrenamiento por mes, armado con las máquinas de {gymName}.</li>
          <li>Un plan de dieta por mes.</li>
          <li>Mensajes con la IA para tus dudas, todos los días.</li>
        </ul>
      </div>

      <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-secondary/50 p-3">
        <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" />
        <span className="space-y-0.5">
          <span className="block text-sm font-medium">Dejar que {gymName} vea mi nombre y cuándo entrené por última vez</span>
          <span className="block text-xs text-muted-foreground">
            Así puede ayudarte si te alejás. Nunca ve tu peso, tus fotos ni tus comidas. Lo podés cambiar cuando quieras en Ajustes.
          </span>
        </span>
      </label>

      <div className="space-y-2">
        <Button className="w-full" disabled={pending} onClick={accept}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Unirme a {gymName}
        </Button>
        <Button variant="ghost" className="w-full" disabled={pending} onClick={later}>
          Ahora no
        </Button>
      </div>
    </div>
  );
}
