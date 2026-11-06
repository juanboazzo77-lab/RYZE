'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BookingState } from './classes';
import { bookMyClass, cancelMyClass } from './class-actions';

const BOOK_ERRORS: Record<string, string> = {
  FULL: 'La clase se llenó.',
  STARTED: 'La clase ya empezó.',
  ALREADY: 'Ya tenés un lugar en esta clase.',
  BAD_DATE: 'Esa fecha no está disponible todavía.',
  NOT_FOUND: 'Esa clase ya no está.',
};

/** Reservar, cancelar o ver por qué no se puede. */
export function ClassButton({ classId, date, state }: { classId: string; date: string; state: BookingState }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function book() {
    start(async () => {
      const res = await bookMyClass({ classId, date });
      if (res.ok) toast.success('¡Reservado! Te esperamos.');
      else toast.error(BOOK_ERRORS[res.error ?? ''] ?? 'No se pudo reservar. Probá de nuevo.');
      router.refresh();
    });
  }

  function cancel() {
    start(async () => {
      const res = await cancelMyClass({ classId, date });
      if (res.ok) toast.success('Reserva cancelada.');
      else if (res.error === 'TOO_LATE') toast.error('Ya no se puede cancelar: faltan menos de 2 horas. Avisá en recepción.');
      else toast.error('No se pudo cancelar. Probá de nuevo.');
      router.refresh();
    });
  }

  if (state === 'BOOKABLE')
    return (
      <Button size="sm" disabled={pending} onClick={book}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Reservar
      </Button>
    );
  if (state === 'MINE')
    return (
      <Button size="sm" variant="outline" disabled={pending} onClick={cancel}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Cancelar
      </Button>
    );
  if (state === 'MINE_LOCKED')
    return (
      <Button size="sm" variant="ghost" disabled title="Faltan menos de 2 horas: ya no se puede cancelar">
        Reservada
      </Button>
    );
  return (
    <Button size="sm" variant="ghost" disabled>
      {state === 'FULL' ? 'Completa' : 'Empezó'}
    </Button>
  );
}
