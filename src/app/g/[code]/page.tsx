import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarCheck, Dumbbell, MessageCircle, Salad } from 'lucide-react';
import { getUserContext } from '@/server/context';
import { getGymLanding } from '@/server/gym-referrals';
import { getWebPlanStatus, mpPriceArs, syncUserSubscription, syncWebMembership } from '@/server/billing/mercadopago';
import { brandTheme } from '@/features/gym/brand';
import { ActivatePlanForm } from '@/features/gym/activate-plan-form';

export const metadata: Metadata = {
  title: 'Activá tu plan · Forza AI',
  // Es una página para quien escanea el QR del gimnasio: no tiene que salir en buscadores.
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const BENEFITS = [
  { icon: Dumbbell, title: 'Tu plan de entrenamiento', text: 'Armado para vos, con las máquinas de tu gimnasio.' },
  { icon: Salad, title: 'Tu plan de dieta', text: 'Una propuesta de comidas para tus objetivos.' },
  { icon: MessageCircle, title: 'Un coach con IA', text: 'Resolvé tus dudas del día a día cuando quieras.' },
  { icon: CalendarCheck, title: 'Clases, retos y rutinas', text: 'Reservá tus clases y sumate a los desafíos de tu gimnasio.' },
] as const;

/** Página pública de un gimnasio: la abre el QR que el gimnasio pega en su local. */
/** Descarga de la app. Los enlaces se cargan por variable cuando la app esté publicada; mientras tanto se avisa que viene. */
function StoreLinks() {
  const ios = process.env.NEXT_PUBLIC_APP_STORE_URL?.trim();
  const android = process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim();
  if (!ios && !android) {
    return <p className="text-center text-xs text-muted-foreground">Muy pronto vas a poder descargar la app desde App Store y Google Play. Entrá con esta misma cuenta.</p>;
  }
  const cls = 'inline-flex h-11 flex-1 items-center justify-center rounded-full border text-sm font-semibold transition-colors hover:bg-secondary';
  return (
    <div className="flex gap-2">
      {ios ? <a href={ios} className={cls}>App Store</a> : null}
      {android ? <a href={android} className={cls}>Google Play</a> : null}
    </div>
  );
}

export default async function GymLandingPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ pago?: string; preapproval_id?: string }> }) {
  const { code } = await params;
  const { pago, preapproval_id: mpReturn } = await searchParams;
  const gym = await getGymLanding(code);
  if (!gym) notFound();

  const ctx = await getUserContext();
  const isMember = ctx?.gym?.gymId === gym.id;
  // Si ya inició un pago que todavía no figura como activo, le preguntamos directo a Mercado Pago (sin esperar su
  // aviso). No depende de cómo vuelva de Mercado Pago: a veces la dirección de retorno pierde los parámetros.
  let planStatus = ctx ? await getWebPlanStatus(ctx.userId) : null;
  if (ctx && planStatus && planStatus !== 'AUTHORIZED') {
    await syncUserSubscription(ctx.userId).catch((e) => console.error('[mercadopago] no se pudo confirmar al volver:', e instanceof Error ? e.message : e));
    planStatus = await getWebPlanStatus(ctx.userId);
  }
  if (ctx && planStatus === 'AUTHORIZED') await syncWebMembership(ctx.userId);
  // Está esperando la confirmación: volvió de Mercado Pago (con o sin parámetros) y el pago figura pendiente.
  const confirming = Boolean(ctx) && planStatus === 'PENDING' && Boolean(pago === 'ok' || mpReturn);
  const price = `${mpPriceArs().toLocaleString('es-AR')}`;
  const here = `/g/${encodeURIComponent(code)}`;
  const theme = brandTheme(gym.brandColor);

  return (
    <div style={theme ?? undefined} className="min-h-screen bg-[radial-gradient(60rem_30rem_at_50%_-10%,var(--accent),transparent)] px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <span className="grid size-16 place-items-center overflow-hidden rounded-2xl border bg-white shadow-sm">
              {gym.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={gym.logoUrl} alt="" className="size-full object-contain p-1.5" />
              ) : (
                <span className="text-2xl font-bold text-primary">{gym.name.charAt(0).toUpperCase()}</span>
              )}
            </span>
            <span className="text-2xl font-light text-muted-foreground" aria-hidden="true">
              ×
            </span>
            <span className="grid size-16 place-items-center rounded-2xl border bg-white shadow-sm">
              <Image src="/brand/logo.png" alt="Forza AI" width={44} height={44} priority />
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Entrená con {gym.name}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {gym.name} y Forza AI te dan un entrenador con inteligencia artificial, hecho a medida de tu gimnasio.
          </p>
        </div>

        <ul className="space-y-2.5">
          {BENEFITS.map((b) => (
            <li key={b.title} className="flex items-start gap-3 rounded-2xl border bg-card p-3.5 shadow-sm">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                <b.icon className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold">{b.title}</span>
                <span className="block text-sm text-muted-foreground">{b.text}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
          {planStatus === 'AUTHORIZED' ? (
            <>
              <p className="text-center font-semibold">¡Tu plan está activo!</p>
              <p className="text-center text-sm text-muted-foreground">Ya estás conectado a {gym.name}. Entrá a la app de Forza AI con esta misma cuenta y ya tenés tu plan de entrenamiento, tu dieta y tu coach.</p>
              <StoreLinks />
            </>
          ) : confirming ? (
            <>
              <p className="text-center font-semibold">Estamos confirmando tu pago</p>
              <p className="text-center text-sm text-muted-foreground">Mercado Pago todavía no nos confirmó el pago. Puede tardar unos minutos: recargá esta página en un rato o abrí la app más tarde, tu plan se activa solo.</p>
              <details className="text-center text-xs text-muted-foreground">
                <summary className="cursor-pointer underline">¿No llegaste a pagar? Empezar de nuevo</summary>
                <div className="mt-3 text-left">
                  <ActivatePlanForm code={code} gymName={gym.name} priceLabel={price} />
                </div>
              </details>
            </>
          ) : isMember ? (
            <>
              <p className="text-center font-semibold">Ya sos socio de {gym.name}</p>
              <p className="text-center text-sm text-muted-foreground">Abrí la app de Forza AI con tu cuenta y listo.</p>
            </>
          ) : ctx ? (
            <>
              <p className="text-center text-sm text-muted-foreground">
                Entraste como <span className="font-medium text-foreground">{ctx.email}</span>.
              </p>
              <ActivatePlanForm code={code} gymName={gym.name} priceLabel={price} />
            </>
          ) : (
            <>
              <p className="text-center text-sm text-muted-foreground">Creá tu cuenta gratis o entrá con la que ya tenés, y activá tu plan.</p>
              <Link
                href={`/register?next=${encodeURIComponent(here)}`}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Crear mi cuenta
              </Link>
              <Link
                href={`/login?next=${encodeURIComponent(here)}`}
                className="inline-flex h-11 w-full items-center justify-center rounded-full border text-sm font-semibold transition-colors hover:bg-secondary"
              >
                Ya tengo cuenta
              </Link>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Los planes de la IA son estimaciones y no reemplazan a un profesional.{' '}
          <Link href="/terms" className="underline">
            Términos
          </Link>{' '}
          ·{' '}
          <Link href="/privacy" className="underline">
            Privacidad
          </Link>
        </p>
      </div>
    </div>
  );
}
