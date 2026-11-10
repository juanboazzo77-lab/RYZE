import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireOwnerPage } from '@/lib/owner';
import { getOwnerView, listInvitesForOwner } from '@/server/owner';
import { getPaymentInfo, gymLandingUrl } from '@/server/gym-payment';
import { InviteForm } from '@/features/owner/invite-form';
import { PaymentPoster } from '@/features/owner/payment-poster';
import { PrintButton } from '@/features/owner/print-button';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Invitar clientes' };
export const dynamic = 'force-dynamic';

const LABEL = {
  PENDING: { text: 'Esperando pago', variant: 'secondary' as const },
  APPROVED: { text: 'Invitación enviada', variant: 'warning' as const },
  JOINED: { text: 'Ya es socio', variant: 'success' as const },
  REJECTED: { text: 'No aprobado', variant: 'secondary' as const },
};

export default async function GymInvitesPage() {
  const owner = await requireOwnerPage();
  const [view, invites, info] = await Promise.all([
    getOwnerView(owner.userId, owner.gym.id),
    listInvitesForOwner(owner.userId, owner.gym.id),
    getPaymentInfo(owner.userId, owner.gym.id),
  ]);
  if (!view) redirect('/gym');
  const rows = invites ?? [];

  // En Argentina los clientes entran por el QR: crean su cuenta y pagan su plan en la web. Fuera de Argentina se
  // mantiene la carga de mails con aprobación.
  if (info && info.currency === 'ARS') {
    const webUrl = gymLandingUrl(info.inviteCode);
    return (
      <div className="space-y-4">
        <div className="print:hidden">
          <h1 className="text-2xl font-bold tracking-tight">Invitar clientes</h1>
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
                Cuando se suma alguien aparece en <strong>Clientes</strong> y en el Resumen como «Pagan por su cuenta».
              </p>
            </div>
          </>
        )}

        {rows.length > 0 ? (
          <section className="space-y-2 print:hidden">
            <h2 className="text-base font-semibold">Invitaciones anteriores por mail</h2>
            <ul className="divide-y rounded-xl border">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span className="min-w-0 truncate">{r.email}</span>
                  <Badge variant={r.status === 'PENDING' && r.paid ? 'warning' : LABEL[r.status].variant}>
                    {r.status === 'PENDING' && r.paid ? 'Pago recibido' : LABEL[r.status].text}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  const count = (s: keyof typeof LABEL) => rows.filter((r) => r.status === s).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invitar socios</h1>
        <p className="text-sm text-muted-foreground">
          Cargá los mails de tus clientes y mandanos el comprobante de pago. Cuando confirmamos el pago y aprobamos el pedido, cada cliente recibe un mail con tu invitación a Forza AI. Para ellos es gratis: lo cubre el gimnasio.
        </p>
      </div>

      {view.status !== 'ACTIVE' ? (
        <p className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">
          {view.status === 'PENDING'
            ? 'Tu gimnasio todavía está en revisión: apenas lo aprobemos vas a poder invitar socios.'
            : 'Tu gimnasio está suspendido: por ahora no se pueden invitar socios. Escribinos a gimnasios@forzaai.app.'}
        </p>
      ) : null}

      <InviteForm
        disabled={view.status !== 'ACTIVE'}
        pricePerMember={view.pricePerMember}
        currency={view.currency}
        paymentInstructions={process.env.GYM_PAYMENT_INSTRUCTIONS || 'Pedinos los datos para transferir escribiendo a gimnasios@forzaai.app, y mandanos ahí el comprobante.'}
      />

      <div className="rounded-xl bg-secondary/50 p-3 text-sm">
        <p className="font-medium">Lo que recibe cada cliente</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
          <li>Un plan de entrenamiento por mes, armado con las máquinas de tu gimnasio.</li>
          <li>Un plan de dieta por mes.</li>
          <li>Mensajes con la IA para sus dudas del día a día.</li>
        </ul>
      </div>

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">Tus pedidos</h2>
          <p className="text-xs text-muted-foreground">
            {count('JOINED')} socios · {count('APPROVED')} invitados · {count('PENDING')} esperando
          </p>
        </div>
        {rows.length === 0 ? (
          <p className="rounded-xl border p-3 text-sm text-muted-foreground">Todavía no cargaste ningún mail.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="min-w-0 truncate">{r.email}</span>
                <Badge variant={r.status === 'PENDING' && r.paid ? 'warning' : LABEL[r.status].variant}>
                  {r.status === 'PENDING' && r.paid ? 'Pago recibido' : LABEL[r.status].text}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
