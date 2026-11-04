'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cancelTrainerRole } from './actions';
import { TC } from './copy';

/** El entrenador deja de serlo y su cuenta vuelve a ser de cliente. */
export function CancelTrainerButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function cancel() {
    if (!confirm(TC.cancelConfirm)) return;
    start(async () => {
      const res = await cancelTrainerRole();
      if (res.ok) {
        // Ahora es cliente: va al cuestionario de cliente (sin volver a preguntar qué tipo de cuenta es).
        router.replace('/onboarding?client=1');
        router.refresh();
      } else toast.error(TC.error);
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={cancel} disabled={pending} className="text-destructive">
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {TC.cancelButton}
    </Button>
  );
}
