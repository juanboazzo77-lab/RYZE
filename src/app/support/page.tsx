import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata: Metadata = { title: 'Soporte · FORZA AI' };

const CONTACT_EMAIL = 'gymoia3@gmail.com';

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-lg font-semibold tracking-tight">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>;
}
function Li({ children }: { children: React.ReactNode }) {
  return <li className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</li>;
}

export default function SupportPage() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <Link
        href="/login"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight">Soporte de FORZA AI</h1>
      <P>
        ¿Tenés un problema, una duda o una sugerencia? Escribinos a{' '}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> y te
        respondemos lo antes posible.
      </P>

      <H2>Preguntas frecuentes</H2>

      <P>
        <strong className="text-foreground">¿Cómo cambio o cancelo mi suscripción?</strong>
      </P>
      <P>
        Las suscripciones (BASIC, PRO y COACH) se gestionan desde la tienda donde te suscribiste:
        en iPhone, desde Ajustes del sistema → tu nombre → Suscripciones; en Android, desde Google
        Play → Pagos y suscripciones → Suscripciones. FORZA AI no puede cobrarte ni cancelarte la
        suscripción directamente, pero podés ver el estado de tu plan en Ajustes dentro de la app.
      </P>

      <P>
        <strong className="text-foreground">¿Cómo exporto o borro mis datos?</strong>
      </P>
      <P>
        Desde la app: Ajustes → Cuenta. Ahí podés exportar una copia completa de tus datos en JSON,
        o eliminar tu cuenta y todos tus datos de forma permanente e inmediata, sin necesidad de
        escribirnos.
      </P>

      <P>
        <strong className="text-foreground">El AI Coach no me responde o tarda mucho</strong>
      </P>
      <P>
        A veces el modelo de IA tiene picos de demora. Si un mensaje falla, probá de nuevo en unos
        segundos. Si el problema persiste, contanos qué pasó a{' '}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </P>

      <P>
        <strong className="text-foreground">Encontré un error o algo no funciona</strong>
      </P>
      <P>
        Contanos qué pasó, en qué pantalla y en qué dispositivo — cuanto más detalle, más rápido lo
        solucionamos.
      </P>

      <H2>Más información</H2>
      <ul className="list-disc space-y-1 pl-5">
        <Li>
          <Link className="underline" href="/privacy">
            Política de Privacidad
          </Link>
        </Li>
        <Li>
          <Link className="underline" href="/terms">
            Términos de Servicio
          </Link>
        </Li>
      </ul>
    </div>
  );
}
