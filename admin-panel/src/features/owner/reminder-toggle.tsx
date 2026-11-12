'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { setClientRemindersAction } from './reminder-actions';

/** Prender o apagar los recordatorios automáticos de cuota a los clientes. */
export function ReminderToggle({ initial, clientsWithEmail }: { initial: boolean; clientsWithEmail: number }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();

  function toggle(next: boolean) {
    setOn(next);
    start(async () => {
      const res = await setClientRemindersAction({ on: next });
      if (res.ok) {
        toast.success(next ? 'Recordatorios prendidos.' : 'Recordatorios apagados.');
        router.refresh();
      } else {
        setOn(!next);
        toast.error('No se pudo cambiar. Probá de nuevo.');
      }
    });
  }

  return (
    <label className="flex items-start gap-3 rounded-xl border p-4">
      <input type="checkbox" className="mt-1 size-4" checked={on} disabled={pending} onChange={(e) => toggle(e.target.checked)} />
      <span className="text-sm">
        <span className="block font-semibold">Recordatorios de cuota a tus clientes</span>
        <span className="block text-muted-foreground">
          Les mandamos un mail 3 días antes de que venza su cuota, el día que vence y 3 días después si sigue sin pagar, con tu link de pago o tu alias. Llega a los {clientsWithEmail} {clientsWithEmail === 1 ? 'cliente que tiene' : 'clientes que tienen'} mail en tu lista.
        </span>
      </span>
    </label>
  );
}
