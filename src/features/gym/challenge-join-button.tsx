'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { joinMyChallenge, leaveMyChallenge } from './challenge-actions';

/** Sumarse a un reto (o bajarse). Sumarse implica aparecer en el ranking con nombre e inicial del apellido: se avisa en pantalla. */
export function ChallengeJoinButton({ id, joined }: { id: string; joined: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(join: boolean) {
    start(async () => {
      const res = join ? await joinMyChallenge({ id }) : await leaveMyChallenge({ id });
      if (res.ok) {
        toast.success(join ? '¡Te sumaste al reto!' : 'Te bajaste del reto.');
        router.refresh();
      } else toast.error(res.error === 'ENDED' ? 'Este reto ya terminó.' : 'No se pudo. Probá de nuevo.');
    });
  }

  return joined ? (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(false)}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Bajarme
    </Button>
  ) : (
    <Button size="sm" disabled={pending} onClick={() => run(true)}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Sumarme
    </Button>
  );
}
