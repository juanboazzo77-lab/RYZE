'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { savePaymentAction } from './payment-actions';

/** Dónde le pagan los clientes al gimnasio: su link de pago (con eso se arma el QR) y su alias o CBU. */
export function PaymentForm({ link, alias }: { link: string | null; alias: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [l, setL] = useState(link ?? '');
  const [a, setA] = useState(alias ?? '');

  function save() {
    start(async () => {
      const res = await savePaymentAction({ link: l, alias: a });
      if (res.ok) {
        toast.success('Guardado.');
        router.refresh();
      } else if (res.error === 'INVALID_LINK') toast.error('El link tiene que empezar con https:// y ser uno solo.');
      else if (res.error === 'INVALID_ALIAS') toast.error('El alias tiene entre 6 y 40 letras, números, puntos o guiones. O un CBU de 22 números.');
      else toast.error('No se pudo guardar. Probá de nuevo.');
    });
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Link de pago (con esto se arma el QR)</span>
        <span className="block text-xs text-muted-foreground">
          En la app de Mercado Pago: Cobrar → Link de pago (o "Mi link"). Copiá el link y pegalo acá. También sirve el de tu banco o billetera.
        </span>
        <Input value={l} onChange={(e) => setL(e.target.value)} placeholder="https://mpago.la/..." inputMode="url" maxLength={500} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Alias o CBU para transferir (opcional)</span>
        <Input value={a} onChange={(e) => setA(e.target.value)} placeholder="mi.gimnasio.mp" maxLength={40} />
      </label>
      <Button disabled={pending} onClick={save}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Guardar
      </Button>
    </div>
  );
}
