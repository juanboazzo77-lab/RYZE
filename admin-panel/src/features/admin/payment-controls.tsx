'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { markPaymentPaid, updateGymPrice } from './actions';

/** Marcar un cobro como pagado (con una nota opcional, por ejemplo "transferencia 12/11") o deshacerlo. */
export function PaidButton({ id, paid }: { id: string; paid: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function click() {
    let note: string | undefined;
    if (!paid) {
      const answer = window.prompt('Nota del pago (opcional), por ejemplo "transferencia del 12/11":', '');
      if (answer === null) return;
      note = answer;
    }
    start(async () => {
      const res = await markPaymentPaid({ id, paid: !paid, note });
      if (res.ok) router.refresh();
      else toast.error('No se pudo actualizar.');
    });
  }

  return (
    <Button size="sm" variant={paid ? 'outline' : 'default'} disabled={pending} onClick={click}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {paid ? 'Deshacer' : 'Marcar pagado'}
    </Button>
  );
}

/** Precio por socio de un gimnasio (US$ por mes). Cambia los cobros pendientes; los pagados no se tocan. */
export function PriceEditor({ gymId, price }: { gymId: string; price: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState(String(price));
  const n = Number(text.replace(',', '.'));
  const valid = Number.isFinite(n) && n >= 0 && n <= 1000;

  return (
    <div className="flex items-center gap-2">
      <Input inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} className="h-8 w-20 text-right" />
      <Button
        size="sm"
        variant="outline"
        disabled={pending || !valid || n === price}
        onClick={() =>
          start(async () => {
            const res = await updateGymPrice({ gymId, price: n });
            if (res.ok) {
              toast.success('Precio guardado.');
              router.refresh();
            } else toast.error('No se pudo guardar.');
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Guardar
      </Button>
    </div>
  );
}
