'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tellClientUpdated } from './followup-actions';
import { FU } from './copy';

/** Avisa al cliente, por el chat, que el entrenador actualizó su rutina. */
export function TellClientButton({ clientId }: { clientId: string }) {
  const [pending, start] = useTransition();
  function tell() {
    start(async () => {
      const res = await tellClientUpdated({ clientId, what: 'routine' });
      if (res.ok) toast.success(FU.told);
      else toast.error(FU.error);
    });
  }
  return (
    <Button variant="outline" size="sm" onClick={tell} disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {FU.tellRoutine}
    </Button>
  );
}
