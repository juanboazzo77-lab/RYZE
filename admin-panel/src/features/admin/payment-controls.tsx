'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { markPaymentPaid, updateGymPrice } from './actions';
import { priceLimit, type Currency } from '@/features/gym/money';

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

/** Precio por socio de un gimnasio (por mes) y su moneda. Cambia los cobros pendientes; los pagados no se tocan. */
export function PriceEditor({ gymId, price, currency }: { gymId: string; price: number; currency: Currency }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState(String(price));
  const [cur, setCur] = useState<Currency>(currency);
  const n = Number(text.replace(',', '.'));
  const valid = Number.isFinite(n) && n >= 0 && n <= priceLimit(cur);

  return (
    <div className="flex items-center gap-2">
      <select
        value={cur}
        onChange={(e) => setCur(e.target.value as Currency)}
        aria-label="Moneda"
        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="ARS">$ ARS</option>
        <option value="USD">US$</option>
      </select>
      <Input inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} className="h-8 w-24 text-right" />
      <Button
        size="sm"
        variant="outline"
        disabled={pending || !valid || (n === price && cur === currency)}
        onClick={() =>
          start(async () => {
            const res = await updateGymPrice({ gymId, price: n, currency: cur });
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
