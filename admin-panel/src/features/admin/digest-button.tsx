'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sendDigestNow } from './digest-actions';

/** Manda el resumen del día por mail ahora, para probar que los avisos llegan. */
export function DigestButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await sendDigestNow();
          if (res.ok) toast.success('Resumen enviado a gestion@forzaai.app.');
          else if (res.error === 'NOT_CONFIGURED') toast.error('Falta cargar RESEND_API_KEY en el panel.');
          else toast.error('No se pudo enviar. Revisá la clave de Resend.');
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
      Enviarme el resumen por mail
    </Button>
  );
}
