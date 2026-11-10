import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireOwnerPage } from '@/lib/owner';
import { getPaymentInfo, gymLandingUrl } from '@/server/gym-payment';
import { PaymentForm } from '@/features/owner/payment-form';
import { PaymentPoster, type PosterKind } from '@/features/owner/payment-poster';
import { PrintButton } from '@/features/owner/print-button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'QR de cobro' };
export const dynamic = 'force-dynamic';

/** Los QR para que los clientes paguen: la cuota y, aparte, el plan de rutina con IA. Se cargan los links, se imprime el cartel y se pone en el mostrador. */
export default async function PaymentQrPage({ searchParams }: { searchParams: Promise<{ cartel?: string }> }) {
  const owner = await requireOwnerPage();
  const { cartel } = await searchParams;
  const info = await getPaymentInfo(owner.userId, owner.gym.id);
  if (!info) return null;
  if (info.currency !== 'ARS') {
    return (
      <div className="space-y-3">
        <Link href="/gym/cobros" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          Cobros
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">QR para que te paguen</h1>
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">Los QR de cobro están disponibles por ahora solo para gimnasios de Argentina.</p>
      </div>
    );
  }

  const kind: PosterKind = cartel === 'plan' ? 'PLAN' : cartel === 'web' ? 'WEB' : 'FEE';
  const webUrl = gymLandingUrl(info.inviteCode);
  const ready = kind === 'WEB' ? Boolean(webUrl) : kind === 'PLAN' ? Boolean(info.planLink) : Boolean(info.link || info.alias);
  const tabs: Array<{ key: PosterKind; label: string; href: string }> = [
    { key: 'FEE', label: 'Cuota', href: '/gym/cobros/qr' },
    { key: 'PLAN', label: 'Plan de rutina con IA', href: '/gym/cobros/qr?cartel=plan' },
    { key: 'WEB', label: 'Activar plan en la web', href: '/gym/cobros/qr?cartel=web' },
  ];

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <Link href="/gym/cobros" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          Cobros
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">QR para que te paguen</h1>
        <p className="text-sm text-muted-foreground">
          Cargá tus links de pago, imprimí el cartel y pegalo en el mostrador. El cliente escanea y paga; cuando te llega el pago, tocás <strong>Pagó</strong> en Clientes. Si cobrás el plan de rutina aparte, cuando pague cargá su mail en <strong>Invitar</strong>.
        </p>
      </div>

      <div className="print:hidden">
        <PaymentForm link={info.link} alias={info.alias} planLink={info.planLink} planAmount={info.planAmount} />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex gap-1">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                className={cn('rounded-full px-3 py-1.5 text-sm transition-colors', t.key === kind ? 'bg-secondary font-medium' : 'text-muted-foreground hover:bg-secondary/60')}
              >
                {t.label}
              </Link>
            ))}
          </div>
          {ready ? <PrintButton /> : null}
        </div>
        {ready ? (
          <>
            <PaymentPoster info={info} kind={kind} />
            {kind === 'WEB' && webUrl ? (
              <p className="break-all text-center text-xs text-muted-foreground print:hidden">
                Este QR abre la página de tu gimnasio: <span className="font-mono">{webUrl}</span>
              </p>
            ) : null}
            {kind === 'FEE' && !info.link ? <p className="text-xs text-muted-foreground print:hidden">Para que aparezca el código QR, cargá un link de pago arriba. Por ahora el cartel muestra solo el alias.</p> : null}
          </>
        ) : (
          <p className="rounded-xl border p-4 text-sm text-muted-foreground print:hidden">
            {kind === 'WEB' ? 'Tu página web se activa cuando aprobamos tu gimnasio. Apenas esté lista, acá aparece el cartel con su QR.' : kind === 'PLAN' ? 'Cargá el link de pago del plan arriba y acá aparece el cartel con su QR.' : 'Cargá tu link de pago o tu alias arriba y acá aparece el cartel.'}
          </p>
        )}
      </section>
    </div>
  );
}
