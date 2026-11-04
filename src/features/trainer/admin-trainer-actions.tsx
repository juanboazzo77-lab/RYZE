'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminSetTrainerStatus } from './actions';
import { TC } from './copy';
import type { TrainerStatus } from './logic';

/** Botones para aprobar, suspender o reactivar a un entrenador. */
export function AdminTrainerActions({ userId, status }: { userId: string; status: TrainerStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function set(next: TrainerStatus) {
    start(async () => {
      const res = await adminSetTrainerStatus({ userId, status: next });
      if (res.ok) router.refresh();
      else toast.error(TC.error);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      {status !== 'ACTIVE' ? (
        <Button size="sm" onClick={() => set('ACTIVE')} disabled={pending}>
          {status === 'SUSPENDED' ? TC.reactivate : TC.approve}
        </Button>
      ) : null}
      {status === 'ACTIVE' ? (
        <Button size="sm" variant="outline" onClick={() => set('SUSPENDED')} disabled={pending}>
          {TC.suspend}
        </Button>
      ) : null}
      {status === 'SUSPENDED' ? (
        <Button size="sm" variant="ghost" onClick={() => set('PENDING')} disabled={pending}>
          {TC.setPending}
        </Button>
      ) : null}
    </div>
  );
}
