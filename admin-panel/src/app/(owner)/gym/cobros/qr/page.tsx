import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireOwnerPage } from '@/lib/owner';
import { getPaymentInfo } from '@/server/gym-payment';
import { PaymentForm } from '@/features/owner/payment-form';
import { PaymentPoster } from '@/features/owner/payment-poster';
import { PrintButton } from '@/features/owner/print-button';

export const metadata: Metadata = { title: 'QR de cobro' };
export const dynamic = 'force-dynamic';

/** El QR para que los clientes paguen la cuota: se carga el link de pago, se imprime el cartel y se pone en el mostrador. */
export default async function PaymentQrPage() {
  const owner = await requireOwnerPage();
  const info = await getPaymentInfo(owner.userId, owner.gym.id);
  if (!info) return null;
  const ready = Boolean(info.link || info.alias);

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <Link href="/gym/cobros" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          Cobros
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">QR para que te paguen</h1>
        <p className="text-sm text-muted-foreground">
          Cargá tu link de pago, imprimí el cartel y pegalo en el mostrador. El cliente escanea y paga; cuando te llega el pago, tocás <strong>Pagó</strong> en Clientes.
        </p>
      </div>

      <div className="print:hidden">
        <PaymentForm link={info.link} alias={info.alias} />
      </div>

      {ready ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2 print:hidden">
            <h2 className="text-base font-semibold">Tu cartel</h2>
            <PrintButton />
          </div>
          <PaymentPoster info={info} />
          {!info.link ? <p className="text-xs text-muted-foreground print:hidden">Para que aparezca el código QR, cargá un link de pago arriba. Por ahora el cartel muestra solo el alias.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
