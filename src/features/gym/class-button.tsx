'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BookingState } from './classes';
import { bookMyClass, cancelMyClass, joinMyWaitlist, leaveMyWaitlist } from './class-actions';

const BOOK_ERRORS: Record<string, string> = {
  FULL: 'La clase se llenó.',
  STARTED: 'La clase ya empezó.',
  ALREADY: 'Ya tenés un lugar en esta clase.',
  BAD_DATE: 'Esa fecha no está disponible todavía.',
  NOT_FOUND: 'Esa clase ya no está.',
  NOT_IN_PLAN: 'Esta clase no está incluida en tu plan. Consultá en recepción.',
  AWAITING_PLAN: 'Tu gimnasio todavía tiene que confirmar tu plan. Consultá en recepción.',
  TRIAL_ENDED: 'Terminó tu prueba gratis. Activá tu plan para reservar clases.',
  NOT_FULL: 'Todavía hay lugar: reservá directamente.',
  WEEK_LIMIT: 'Ya usaste todas las reservas de esta semana que te da tu plan.',
};

/** Reservar, cancelar o ver por qué no se puede. */
export function ClassButton({ classId, date, state, inPlan = true, awaitingPlan = false, onWaitlist = false }: { classId: string; date: string; state: BookingState; inPlan?: boolean; awaitingPlan?: boolean; onWaitlist?: boolean }) {
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

  function wait(join: boolean) {
    start(async () => {
      const res = join ? await joinMyWaitlist({ classId, date }) : await leaveMyWaitlist({ classId, date });
      if (res.ok) toast.success(join ? 'Te anotaste en la lista de espera. Si se libera un lugar, entrás solo y te avisamos por mail.' : 'Saliste de la lista de espera.');
      else toast.error(BOOK_ERRORS[res.error ?? ''] ?? 'No se pudo. Probá de nuevo.');
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

  if (state === 'FULL' && inPlan)
    return (
      <Button size="sm" variant={onWaitlist ? 'outline' : 'default'} disabled={pending} onClick={() => wait(!onWaitlist)}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {onWaitlist ? 'En lista de espera · Salir' : 'Lista de espera'}
      </Button>
    );
  if (state === 'BOOKABLE' && !inPlan)
    return (
      <Button size="sm" variant="ghost" disabled title="Esta clase no está incluida en tu plan">
        {awaitingPlan ? 'Falta tu plan' : 'No incluida'}
      </Button>
    );
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
