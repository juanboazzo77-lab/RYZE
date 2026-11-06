'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminResendInvite } from './invite-actions';

export function ResendButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await adminResendInvite({ id });
          if (res.ok) {
            toast.success('Mail enviado.');
            router.refresh();
          } else toast.error('No se pudo enviar. Revisá la clave de Resend.');
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Reenviar
    </Button>
  );
}
