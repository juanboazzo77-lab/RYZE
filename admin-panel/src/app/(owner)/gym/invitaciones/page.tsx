import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireOwnerPage } from '@/lib/owner';
import { getOwnerView } from '@/server/owner';
import { getPaymentInfo, gymLandingUrl } from '@/server/gym-payment';
import { PaymentPoster } from '@/features/owner/payment-poster';
import { PrintButton } from '@/features/owner/print-button';

export const metadata: Metadata = { title: 'Mi QR e invitar' };
export const dynamic = 'force-dynamic';

/** Tus clientes se suman con tu QR: escanean, crean su cuenta, pagan su plan y quedan conectados al gimnasio. */
export default async function GymInvitesPage() {
  const owner = await requireOwnerPage();
  const [view, info] = await Promise.all([getOwnerView(owner.userId, owner.gym.id), getPaymentInfo(owner.userId, owner.gym.id)]);
  if (!view) redirect('/gym');

  if (!info || info.currency !== 'ARS') {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Mi QR</h1>
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">
          El QR para que tus clientes se sumen y paguen su plan está disponible por ahora solo para gimnasios de Argentina. Si tu gimnasio está en otro país, escribinos a gimnasios@forzaai.app.
        </p>
      </div>
    );
  }

  const webUrl = gymLandingUrl(info.inviteCode);
  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">Mi QR</h1>
        <p className="text-sm text-muted-foreground">
          Imprimí este QR y ponelo en el mostrador, o mandá el link por WhatsApp. Cada cliente lo escanea, crea su cuenta, paga su plan mensual con Mercado Pago y queda conectado a tu gimnasio: ve tus rutinas, clases y retos. <strong>Vos no pagás nada por ellos.</strong>
        </p>
      </div>

      {view.status !== 'ACTIVE' || !webUrl ? (
        <p className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm print:hidden">
          {view.status === 'SUSPENDED'
            ? 'Tu gimnasio está suspendido: por ahora el QR no está disponible. Escribinos a gimnasios@forzaai.app.'
            : 'Tu gimnasio todavía está en revisión: apenas lo aprobemos acá aparece tu QR.'}
        </p>
      ) : (
        <>
          <div className="flex justify-end print:hidden">
            <PrintButton />
          </div>
          <PaymentPoster info={info} kind="WEB" />
          <div className="space-y-1 text-center print:hidden">
            <p className="text-xs text-muted-foreground">Link para mandar por WhatsApp o redes:</p>
            <p className="select-all break-all rounded-xl border bg-secondary/40 px-3 py-2 font-mono text-sm">{webUrl}</p>
          </div>
          <div className="rounded-xl bg-secondary/50 p-3 text-sm print:hidden">
            <p className="font-medium">Lo que recibe cada cliente</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
              <li>Un plan de entrenamiento por mes, armado con las máquinas de tu gimnasio.</li>
              <li>Un plan de dieta por mes y mensajes con la IA para sus dudas del día a día.</li>
              <li>Tus rutinas, clases y retos, con los colores de tu gimnasio.</li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Cuando se suma alguien aparece en <strong>Clientes</strong> y en el Resumen como «Pagan su plan por su cuenta».
            </p>
          </div>
        </>
      )}
    </div>
  );
}
