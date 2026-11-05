'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminInviteGymOwner, adminSetGymOwner } from './actions';

/**
 * Dueño del gimnasio. Se vincula con la cuenta de Forza AI que tenga ese mail. Si todavía no tiene cuenta, se
 * le crea una y se le manda un mail para que elija su contraseña; al entrar ve "Mi gimnasio" en Ajustes.
 */
export function OwnerLink({ gymId, ownerEmail, suggestedEmail }: { gymId: string; ownerEmail: string | null; suggestedEmail: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState(ownerEmail ?? suggestedEmail);
  const [manualLink, setManualLink] = useState<string | null>(null);
  const changed = email.trim().toLowerCase() !== (ownerEmail ?? '').toLowerCase();

  function invite(resend: boolean) {
    start(async () => {
      const res = await adminInviteGymOwner({ gymId, email, resend });
      if (res.ok) {
        if (res.emailSent) {
          toast.success(res.created ? 'Cuenta creada y mail enviado al dueño.' : resend ? 'Enlace reenviado.' : 'Dueño vinculado y avisado por mail.');
          setManualLink(null);
        } else {
          toast.warning('Quedó vinculado, pero el mail no salió. Pasale el enlace a mano.');
          setManualLink(res.link ?? null);
        }
        router.refresh();
      } else if (res.error === 'NOT_CONFIGURED') {
        toast.error('Falta cargar SUPABASE_SERVICE_ROLE_KEY en las variables del panel.');
      } else if (res.error === 'CREATE_FAILED') {
        toast.error('No se pudo crear la cuenta. Revisá que el mail esté bien escrito.');
      } else toast.error('No se pudo completar.');
    });
  }

  function save() {
    start(async () => {
      const res = await adminSetGymOwner({ gymId, email });
      if (res.ok) {
        toast.success(email.trim() ? 'Dueño vinculado.' : 'Dueño desvinculado.');
        router.refresh();
      } else if (res.error === 'NO_ACCOUNT') {
        if (confirm('Ese mail todavía no tiene cuenta en Forza AI. ¿Le creo una y le mando un mail para que elija su contraseña?')) invite(false);
      } else toast.error('No se pudo guardar.');
    });
  }

  return (
    <div className="space-y-1 rounded-lg border p-3">
      <p className="text-sm font-medium">Dueño del gimnasio</p>
      <p className="text-xs text-muted-foreground">
        {ownerEmail ? `Cuenta vinculada: ${ownerEmail}.` : 'Todavía no hay una cuenta vinculada.'} Si el mail no tiene cuenta en Forza AI, te ofrece crearla y mandarle un mail para que elija su contraseña. Al entrar, ve “Mi gimnasio” en Ajustes.
      </p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 min-w-0 flex-1" placeholder="mail@del-dueño.com" />
        <Button size="sm" disabled={pending || !changed} onClick={save}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {email.trim() ? 'Vincular' : 'Desvincular'}
        </Button>
        {ownerEmail && !changed ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => invite(true)}>
            Reenviar enlace de contraseña
          </Button>
        ) : null}
      </div>
      {manualLink ? (
        <div className="space-y-1 pt-2">
          <p className="text-xs text-muted-foreground">El mail no salió. Copiá este enlace y pasáselo al dueño por otro medio (sirve una sola vez):</p>
          <input readOnly value={manualLink} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs" />
        </div>
      ) : null}
    </div>
  );
}
