'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { deleteChallengeAction } from './challenge-actions';

export function ChallengeDeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        if (!confirm(`¿Borrar el reto "${title}"? Se pierde el ranking.`)) return;
        start(async () => {
          const res = await deleteChallengeAction({ id });
          if (res.ok) router.refresh();
          else toast.error('No se pudo borrar. Probá de nuevo.');
        });
      }}
    >
      Borrar
    </Button>
  );
}
