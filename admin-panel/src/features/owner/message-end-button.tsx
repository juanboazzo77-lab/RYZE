'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { endClientMessage } from './message-actions';

/** Saca el mensaje de la pantalla de los clientes antes de que venza. */
export function MessageEndButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await endClientMessage({ id });
          if (res.ok) {
            toast.success('Mensaje sacado de la pantalla de tus clientes.');
            router.refresh();
          } else toast.error('No se pudo sacar el mensaje.');
        })
      }
    >
      Sacar ahora
    </Button>
  );
}
