'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { deleteClassAction, setClassActiveAction } from './class-actions';

/** Pausar / mostrar o borrar una clase de la grilla. */
export function ClassRowActions({ id, name, active }: { id: string; name: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex shrink-0 gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await setClassActiveAction({ id, active: !active });
            if (res.ok) router.refresh();
            else toast.error('No se pudo cambiar. Probá de nuevo.');
          })
        }
      >
        {active ? 'Pausar' : 'Reactivar'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (!confirm(`¿Borrar la clase "${name}"? Se borran también las reservas.`)) return;
          start(async () => {
            const res = await deleteClassAction({ id });
            if (res.ok) router.refresh();
            else toast.error('No se pudo borrar. Probá de nuevo.');
          });
        }}
      >
        Borrar
      </Button>
    </div>
  );
}
