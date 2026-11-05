'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminSetGymOwner } from './actions';

/**
 * Vincula el gimnasio con la cuenta de Forza AI de su dueño (por el mail con el que se registró). Esa cuenta
 * ve "Mi gimnasio" en Ajustes. Hace falta que la persona ya tenga cuenta en la app.
 */
export function OwnerLink({ gymId, ownerEmail, suggestedEmail }: { gymId: string; ownerEmail: string | null; suggestedEmail: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState(ownerEmail ?? suggestedEmail);
  const changed = email.trim().toLowerCase() !== (ownerEmail ?? '').toLowerCase();

  return (
    <div className="space-y-1 rounded-lg border p-3">
      <p className="text-sm font-medium">Dueño del gimnasio</p>
      <p className="text-xs text-muted-foreground">
        {ownerEmail ? `Cuenta vinculada: ${ownerEmail}.` : 'Todavía no hay una cuenta vinculada.'} Escribí el mail con el que el dueño se registró en Forza AI; en Ajustes le aparece “Mi gimnasio”.
      </p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 min-w-0 flex-1" placeholder="mail@del-dueño.com" />
        <Button
          size="sm"
          disabled={pending || !changed}
          onClick={() =>
            start(async () => {
              const res = await adminSetGymOwner({ gymId, email });
              if (res.ok) {
                toast.success(email.trim() ? 'Dueño vinculado.' : 'Dueño desvinculado.');
                router.refresh();
              } else if (res.error === 'NO_ACCOUNT') toast.error('No hay ninguna cuenta de Forza AI con ese mail. Que se registre primero.');
              else toast.error('No se pudo guardar.');
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {email.trim() ? 'Vincular' : 'Desvincular'}
        </Button>
      </div>
    </div>
  );
}
