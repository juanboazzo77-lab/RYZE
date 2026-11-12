import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BarChart3,
  Bell,
  CalendarCheck,
  Camera,
  ChevronLeft,
  CreditCard,
  Dumbbell,
  FileDown,
  MessageCircle,
  Palette,
  Salad,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import { BrandMark } from '@/components/brand';
import { GymApplyForm } from '@/features/gym/apply-form';

export const metadata: Metadata = {
  title: 'Forza AI para gimnasios',
  description: 'Un coach de IA para cada cliente de tu gimnasio, hecho con tus máquinas. Vos no pagás nada por ellos y tenés un panel para llevar cuotas, clases y retos.',
};

const CLIENT_GETS = [
  { icon: Dumbbell, title: 'Su plan de entrenamiento', text: 'Uno por mes, armado con las máquinas y la especialidad de tu gimnasio.' },
  { icon: Salad, title: 'Su plan de dieta', text: 'Pensado junto con la rutina: no es lo mismo entrenar en definición que en volumen, ni jugar al fútbol que al tenis.' },
  { icon: MessageCircle, title: 'Un coach con IA', text: 'Para sus dudas de todos los días, cuando quiera. Y una revisión con ajustes cada dos semanas.' },
  { icon: CalendarCheck, title: 'Tu gimnasio adentro', text: 'Ve tus rutinas, reserva sus clases (con lista de espera), se suma a tus retos y lee tus avisos, con tus colores y tu logo.' },
] as const;

const PANEL = [
  { icon: Wallet, title: 'Clientes y cuotas', text: 'Tu lista de clientes, estén o no en la app. Te avisamos a quién le toca pagar y, si querés, el cliente recibe recordatorios solos.' },
  { icon: Camera, title: 'Cargá con una foto', text: 'Imprimís una plantilla, anotás a mano y le sacás una foto: la leemos y armamos la lista. Sin estar todo el día con la compu.' },
  { icon: CreditCard, title: 'Tus planes de pago', text: 'Pase libre, 3 veces por semana, solo musculación… Cada cliente solo se anota a las clases de su plan.' },
  { icon: CalendarCheck, title: 'Clases y lista de espera', text: 'Armás tus clases con cupo. Si una se llena, el primero de la lista entra solo cuando alguien cancela.' },
  { icon: Bell, title: 'Mensajes a tus clientes', text: 'Un aviso (feriado, cambio de horario) que les aparece arriba de la app y les llega como notificación. Para uno solo, WhatsApp.' },
  { icon: Trophy, title: 'Retos y rutinas', text: 'Desafíos con ranking y premio, y las rutinas de tus profes dentro de la app.' },
  { icon: BarChart3, title: 'Reportes y seguimiento', text: 'Quién se suma, quién se va, cuotas cobradas y ocupación de clases. Y quién lleva 10 días sin entrenar, para llamarlo a tiempo.' },
  { icon: Users, title: 'Tu equipo', text: 'Acceso para recepción y profes con permisos limitados. Lo sensible queda solo para vos.' },
  { icon: Palette, title: 'Tu marca', text: 'Tus colores y tu logo en lo que ve el cliente, junto al de Forza AI.' },
] as const;

const FAQ = [
  { q: '¿Cuánto me cuesta?', a: 'Nada. Cada cliente paga su plan por su cuenta ($9.000 por mes con Mercado Pago) y puede cancelar cuando quiera. Lo único que te pedimos es que le ofrezcas el plan a tus clientes y llegues a 10 con el plan.' },
  { q: '¿Me cobran comisión por mis cuotas?', a: 'No. Las cuotas de tu gimnasio son tuyas: las cobrás como siempre. El panel solo te ayuda a llevar el control.' },
  { q: '¿Cómo usan la app mis clientes?', a: 'Pagan su plan en la web (con tu QR o tu link). Después descargan la app de Forza AI desde el App Store e inician sesión con la misma cuenta con la que pagaron. También la pueden usar desde el celular en forzaai.app. La versión de Android está en camino.' },
  { q: '¿Puedo llevar mis clientes aunque no usen la app?', a: 'Sí. Cargás tu lista y llevás cuotas y vencimientos desde el panel, estén o no en la app.' },
  { q: '¿Qué pasa si alguien entra solo con el código?', a: 'Prueba todo gratis 3 días. Después tiene que pagar su plan o escanear tu QR y activarlo para seguir.' },
  { q: '¿Qué datos de mis clientes veo?', a: 'Totales (cuántos entrenaron, cuántos se alejaron) y, solo si el cliente lo permite, su nombre y su última actividad. Nunca su peso, sus fotos ni sus comidas.' },
  { q: '¿Qué pasa si un cliente cancela?', a: 'Deja de pagar y deja de estar conectado a tu gimnasio. Puede volver a activarlo cuando quiera.' },
  { q: '¿Funciona fuera de Argentina?', a: 'Los pagos por QR están hoy para gimnasios de Argentina. Para otros países, escribinos a gimnasios@forzaai.app.' },
] as const;

const PHONES = [
  { src: '/gimnasios/app-inicio.png', alt: 'Inicio del gimnasio en la app', title: 'Tu gimnasio en su inicio', text: 'Tu marca, tus avisos, su próxima clase, el reto del mes y su plan.' },
  { src: '/gimnasios/app-clases.png', alt: 'Clases con reserva según el plan', title: 'Clases con reserva', text: 'Reserva y cancela solo. Las clases que su plan no incluye aparecen bloqueadas.' },
  { src: '/gimnasios/app-rutinas.png', alt: 'Rutinas oficiales del gimnasio', title: 'Tus rutinas', text: 'Las que cargan tus profes, con series y repeticiones.' },
] as const;

function Section({ title, kicker, children }: { title: string; kicker?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        {kicker ? <p className="text-xs font-semibold uppercase tracking-wide text-primary">{kicker}</p> : null}
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

/** Pública: explica qué es Forza AI para gimnasios y, al final, el formulario para pedir el alta (queda pendiente hasta que el administrador la aprueba). */
export default function ApplyPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(60rem_30rem_at_50%_-10%,var(--accent),transparent)] px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl space-y-12">
        {/* Encabezado */}
        <header className="space-y-5 text-center">
          <div className="flex flex-col items-center">
            <BrandMark size={56} />
            <p className="mt-2 text-lg font-bold tracking-tight">Forza AI</p>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Un coach de IA para cada cliente de tu gimnasio, <span className="text-primary">hecho con tus máquinas</span>
          </h1>
          <p className="mx-auto max-w-xl text-base text-muted-foreground">
            Tus clientes entrenan con un plan de rutina y dieta armado para ellos. Vos no pagás nada por esos clientes y tenés un panel para llevar tus cuotas, tus clases y tus retos.
          </p>
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
            <a href="#alta" className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90">
              Pedir el alta de mi gimnasio
            </a>
            <a href="/Forza-AI-para-gimnasios.pdf" target="_blank" rel="noopener" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold transition-colors hover:bg-secondary">
              <FileDown className="size-4" />
              Descargar el PDF
            </a>
          </div>
        </header>

        {/* Quiénes somos */}
        <Section kicker="Quiénes somos" title="Qué es Forza AI">
          <p className="text-muted-foreground">
            Forza AI es una app de entrenamiento y alimentación con inteligencia artificial. Para cada persona arma su rutina y su dieta según su objetivo, su nivel y su día a día, y los va ajustando con el tiempo. Con <strong className="text-foreground">Forza AI para gimnasios</strong>, esa misma app se conecta al tuyo: los planes se arman con tus máquinas y tu especialidad, y tus clientes ven tu marca, tus clases y tus retos.
          </p>
        </Section>

        {/* Cómo funciona */}
        <Section kicker="Cómo funciona" title="En 3 pasos">
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              { t: 'Te damos tu QR y tu código', d: 'Imprimís el QR para el mostrador o mandás el link y el código por WhatsApp.' },
              { t: 'Tu cliente paga en la web', d: 'Escanea el QR, crea su cuenta, deja su nombre y su WhatsApp y activa su plan mensual con Mercado Pago ($9.000 por mes).' },
              { t: 'Descarga la app y entra', d: 'Baja Forza AI del App Store e inicia sesión con la misma cuenta con la que pagó. Queda conectado a tu gimnasio y aparece en tu lista de clientes.' },
            ].map((s, i) => (
              <li key={s.t} className="rounded-2xl border bg-card p-4 shadow-sm">
                <span className="mb-2 grid size-8 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
                <p className="font-semibold">{s.t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
          <div className="flex flex-col items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
            <Smartphone className="size-6 shrink-0 text-primary" aria-hidden="true" />
            <p className="flex-1 text-sm">
              <strong>La app ya está en el App Store.</strong> Para pagar, tu cliente entra a la web (con tu QR o tu link); después descarga la app e inicia sesión con la misma cuenta con la que pagó. La versión de Android está en camino.
            </p>
            <a href="https://apps.apple.com/ar/app/forza-ai/id6812473503" target="_blank" rel="noopener" className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border px-5 text-sm font-semibold transition-colors hover:bg-secondary">
              Ver en el App Store
            </a>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border bg-secondary/40 p-4 text-sm">
            <ScanLine className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <p>
              <strong>Dos formas de sumarse.</strong> Con tu <strong>QR o link</strong>: pagan su plan y quedan conectados. Con tu <strong>código</strong>: lo ingresan en la app y prueban todo gratis 3 días; después tienen que pagar su plan o escanear tu QR y activarlo.
            </p>
          </div>
          <p className="rounded-2xl border-l-4 border-primary bg-primary/5 p-4 text-sm">
            <strong>Vos no pagás nada por esos clientes.</strong> Cada uno paga su plan por su cuenta. Lo único que te pedimos es ofrecerles el plan y llegar a 10 clientes con el plan.
          </p>
        </Section>

        {/* Lo que recibe cada cliente */}
        <Section kicker="Para tus clientes" title="Lo que recibe cada cliente">
          <ul className="grid gap-3 sm:grid-cols-2">
            {CLIENT_GETS.map((c) => (
              <li key={c.title} className="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                  <c.icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold">{c.title}</span>
                  <span className="block text-sm text-muted-foreground">{c.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {/* La app */}
        <Section kicker="La app" title="Así lo ve tu cliente en su celular">
          <p className="text-sm text-muted-foreground">Con el nombre, los colores y las clases de tu gimnasio. Las pantallas son un ejemplo con datos de muestra (“Iron Gym”).</p>
          <div className="grid grid-cols-3 gap-3 sm:gap-5">
            {PHONES.map((p) => (
              <figure key={p.src} className="text-center">
                <div className="relative mx-auto aspect-[390/640] w-full overflow-hidden rounded-[1.4rem] border-[5px] border-foreground bg-white shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.alt} loading="lazy" className="absolute left-0 top-0 block h-auto w-[128.2%] max-w-none" />
                </div>
                <figcaption className="mt-2 text-xs sm:text-sm">
                  <span className="block font-semibold">{p.title}</span>
                  <span className="mt-0.5 hidden text-muted-foreground sm:block">{p.text}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>

        {/* El panel */}
        <Section kicker="Para tu gimnasio" title="Lo que tenés vos en tu panel">
          <ul className="grid gap-3 sm:grid-cols-2">
            {PANEL.map((c) => (
              <li key={c.title} className="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                  <c.icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold">{c.title}</span>
                  <span className="block text-sm text-muted-foreground">{c.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Privacidad */}
        <Section kicker="Privacidad" title="Los datos de tus clientes están cuidados">
          <div className="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Tu gimnasio ve totales (cuántos entrenaron, cuántos se alejaron). Ve el nombre y la última actividad <strong className="text-foreground">solo de quien lo permite</strong>. Nunca ve su peso, sus fotos ni sus comidas. Y las cuotas de tu gimnasio son tuyas: no cobramos comisión sobre ellas.
            </p>
          </div>
        </Section>

        {/* Preguntas */}
        <Section kicker="Preguntas" title="Lo que más nos preguntan">
          <div className="divide-y rounded-2xl border bg-card shadow-sm">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
                  {f.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </Section>

        {/* Formulario */}
        <section id="alta" className="scroll-mt-6 space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Pedí el alta de tu gimnasio</h2>
            <p className="mt-1 text-sm text-muted-foreground">Dejanos tus datos y los revisamos. Apenas lo aprobamos te damos acceso a tu panel y a tu QR: en 10 minutos queda andando.</p>
          </div>
          <div className="mx-auto w-full max-w-md space-y-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <GymApplyForm />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Hoy los pagos por QR están disponibles para gimnasios de Argentina. Precio del plan del cliente: $9.000 ARS por mes, sujeto a cambios con aviso. La app está en el App Store; la versión de Android está en camino.
          </p>
        </section>

        <footer className="space-y-2 pb-4 text-center text-xs text-muted-foreground">
          <Link href="/login" className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-4" />
            Ya tengo cuenta: ingresar
          </Link>
          <p>
            ¿Dudas?{' '}
            <a className="underline hover:text-foreground" href="mailto:gimnasios@forzaai.app">
              gimnasios@forzaai.app
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
