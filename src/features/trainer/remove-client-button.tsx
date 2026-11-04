'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { removeTrainerClient } from './actions';
import { TC } from './copy';

/** El entrenador da de baja a un cliente: deja de ver sus datos. */
export function RemoveClientButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function remove() {
    if (!confirm(TC.removeConfirm)) return;
    start(async () => {
      const res = await removeTrainerClient({ clientId });
      if (res.ok) router.push('/trainer');
      else toast.error(TC.error);
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={remove} disabled={pending} className="text-destructive">
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {TC.removeClient}
    </Button>
  );
}
