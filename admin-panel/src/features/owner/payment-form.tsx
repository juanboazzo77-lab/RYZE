'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { savePaymentAction } from './payment-actions';

const ERRORS: Record<string, string> = {
  INVALID_LINK: 'El link de la cuota tiene que empezar con https:// y ser uno solo.',
  INVALID_ALIAS: 'El alias tiene entre 6 y 40 letras, números, puntos o guiones. O un CBU de 22 números.',
  INVALID_PLAN_LINK: 'El link del plan tiene que empezar con https:// y ser uno solo.',
  INVALID_AMOUNT: 'El valor del plan tiene que ser un número, por ejemplo 5000.',
};

/** Dónde le pagan los clientes al gimnasio: la cuota y, aparte, el plan de rutina con IA. Con cada link se arma un QR. */
export function PaymentForm(props: { link: string | null; alias: string | null; planLink: string | null; planAmount: number | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [link, setLink] = useState(props.link ?? '');
  const [alias, setAlias] = useState(props.alias ?? '');
  const [planLink, setPlanLink] = useState(props.planLink ?? '');
  const [planAmount, setPlanAmount] = useState(props.planAmount === null ? '' : String(props.planAmount));

  function save() {
    start(async () => {
      const res = await savePaymentAction({ link, alias, planLink, planAmount });
      if (res.ok) {
        toast.success('Guardado.');
        router.refresh();
      } else toast.error(ERRORS[res.error ?? ''] ?? 'No se pudo guardar. Probá de nuevo.');
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border p-4">
        <p className="font-semibold">Cuota del gimnasio</p>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Link de pago (con esto se arma el QR)</span>
          <span className="block text-xs text-muted-foreground">
            En la app de Mercado Pago: Cobrar → Link de pago (o "Mi link"). Copiá el link y pegalo acá. También sirve el de tu banco o billetera.
          </span>
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://mpago.la/..." inputMode="url" maxLength={500} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Alias o CBU para transferir (opcional)</span>
          <Input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="mi.gimnasio.mp" maxLength={40} />
        </label>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <div>
          <p className="font-semibold">Plan de rutina con IA (cobro aparte)</p>
          <p className="text-sm text-muted-foreground">
            Si querés cobrarles a tus clientes el plan de entrenamiento y dieta con IA por separado de la cuota, armá un link de pago para ese monto. Se genera un segundo QR.
          </p>
        </div>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Link de pago del plan</span>
          <Input value={planLink} onChange={(e) => setPlanLink(e.target.value)} placeholder="https://mpago.la/..." inputMode="url" maxLength={500} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Valor que le cobrás al cliente por mes (opcional, sale en el cartel)</span>
          <Input value={planAmount} onChange={(e) => setPlanAmount(e.target.value)} placeholder="8000" inputMode="decimal" maxLength={20} />
        </label>
      </div>

      <Button disabled={pending} onClick={save}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Guardar
      </Button>
    </div>
  );
}
