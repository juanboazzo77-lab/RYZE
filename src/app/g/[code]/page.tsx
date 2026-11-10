import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarCheck, Dumbbell, MessageCircle, Salad } from 'lucide-react';
import { getUserContext } from '@/server/context';
import { getGymLanding } from '@/server/gym-referrals';
import { getWebPlanStatus, mpPriceArs, syncUserSubscription } from '@/server/billing/mercadopago';
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
export default async function GymLandingPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ pago?: string }> }) {
  const { code } = await params;
  const { pago } = await searchParams;
  const gym = await getGymLanding(code);
  if (!gym) notFound();

  const ctx = await getUserContext();
  const isMember = ctx?.gym?.gymId === gym.id;
  // Al volver del pago le preguntamos directo a Mercado Pago, sin esperar su aviso.
  if (ctx && pago === 'ok') await syncUserSubscription(ctx.userId).catch((e) => console.error('[mercadopago] no se pudo confirmar al volver:', e instanceof Error ? e.message : e));
  const planStatus = ctx ? await getWebPlanStatus(ctx.userId) : null;
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
              <p className="text-center text-sm text-muted-foreground">Abrí la app de Forza AI con tu cuenta y ya tenés tu plan de entrenamiento, tu dieta y tu coach.</p>
            </>
          ) : pago === 'ok' && ctx ? (
            <>
              <p className="text-center font-semibold">Estamos confirmando tu pago</p>
              <p className="text-center text-sm text-muted-foreground">Mercado Pago nos avisa en unos minutos y tu plan se activa solo. Podés cerrar esta página y abrir la app más tarde.</p>
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
