import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata: Metadata = { title: 'Términos de Servicio · RYZE' };

const LAST_UPDATED = '14 de septiembre de 2026';
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

export default function TermsPage() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <Link
        href="/login"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight">Términos de Servicio de RYZE</h1>
      <p className="mt-1 text-xs text-muted-foreground">Última actualización: {LAST_UPDATED}</p>

      <P>
        Al crear una cuenta o usar RYZE (&ldquo;la app&rdquo;) aceptás estos términos. Si no estás de
        acuerdo con alguno, no uses la app. Los operamos como desarrollador independiente, Juan
        Boazzo — contacto:{' '}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </P>

      <H2>⚠ RYZE no es un profesional de la salud</H2>
      <P>
        Esto es lo más importante de estos términos, léelo con atención. RYZE —incluido todo lo que
        te diga el AI Coach— es una herramienta de organización y estimación, <strong
        className="text-foreground">no reemplaza a un médico, nutricionista ni entrenador licenciado
        </strong>. No diagnostica, no prescribe tratamientos y no debe usarse como única fuente de
        decisiones sobre tu salud. Los cálculos de calorías, macros, cargas de entrenamiento y
        recomendaciones son <strong className="text-foreground">estimaciones</strong> que pueden tener
        errores. Antes de empezar un plan de entrenamiento o de alimentación, especialmente si tenés
        una condición de salud, estás embarazada, tenés antecedentes de trastornos alimenticios o
        cualquier duda médica, consultá a un profesional. Ante dolor, lesión o síntoma, dejá de
        entrenar y consultá a un médico.
      </P>

      <H2>Quién puede usar RYZE</H2>
      <P>
        Necesitás al menos 13 años para crear una cuenta. Si sos menor de 18, necesitás el permiso de
        tu padre, madre o tutor. Al registrarte, confirmás que la información que nos das es real y
        que sos vos quien la carga.
      </P>

      <H2>Tu cuenta</H2>
      <ul className="list-disc space-y-1 pl-5">
        <Li>Sos responsable de mantener segura tu contraseña y de todo lo que pase en tu cuenta.</Li>
        <Li>Avisanos si sospechás un uso no autorizado de tu cuenta.</Li>
        <Li>
          Podés eliminar tu cuenta cuando quieras desde Ajustes → Cuenta; es permanente y no se puede
          deshacer.
        </Li>
        <Li>
          Podemos suspender o eliminar cuentas que violen estos términos, usen la app de forma
          abusiva, o intenten vulnerar la seguridad del servicio.
        </Li>
      </ul>

      <H2>Planes y suscripciones</H2>
      <P>
        RYZE tiene un plan gratuito (FREE) y planes pagos (PRO, COACH) con más funciones.{' '}
        <strong className="text-foreground">Hoy no hay cobros activos</strong>: los planes pagos
        todavía no se pueden contratar dentro de la app. Cuando se habilite el pago, estos términos se
        van a actualizar con los detalles de facturación, renovación y cancelación, y ese cambio se te
        va a mostrar antes de que puedas pagar por primera vez.
      </P>

      <H2>Contenido generado por inteligencia artificial</H2>
      <P>
        El AI Coach, los planes de entrenamiento, los planes de comida y las estimaciones de calorías
        por foto o por texto son generados por un modelo de IA (actualmente Google Gemini) a partir de
        los datos que cargaste. Pueden contener errores, resultar poco precisos o no ser adecuados
        para tu situación particular. Es tu responsabilidad revisar y usar el criterio propio antes de
        seguir cualquier recomendación.
      </P>

      <H2>Qué no podés hacer</H2>
      <ul className="list-disc space-y-1 pl-5">
        <Li>Usar la app para fines ilegales o para dañar a otras personas.</Li>
        <Li>Intentar acceder a datos de otros usuarios o vulnerar la seguridad de la app.</Li>
        <Li>Usar bots, scraping u otros medios automatizados no autorizados.</Li>
        <Li>Hacerte pasar por otra persona o cargar información falsa a propósito.</Li>
        <Li>Intentar romper, sobrecargar o abusar de los límites de uso de la IA.</Li>
      </ul>

      <H2>Propiedad</H2>
      <P>
        Vos sos dueño de los datos que cargás (tu perfil, tus registros, tus fotos antes de que las
        borremos). RYZE y su diseño, marca y código son propiedad de sus desarrolladores. No podés
        copiar, redistribuir ni crear trabajos derivados de la app sin permiso.
      </P>

      <H2>Sin garantías</H2>
      <P>
        RYZE se ofrece &ldquo;tal cual&rdquo;. No garantizamos que el servicio esté libre de errores,
        interrupciones o que vaya a cumplir un resultado específico (por ejemplo, no garantizamos que
        vayas a bajar de peso o mejorar tu rendimiento siguiendo la app). Hacemos lo posible para que
        funcione bien, pero es software en desarrollo activo.
      </P>

      <H2>Límite de responsabilidad</H2>
      <P>
        En la máxima medida permitida por la ley, RYZE y sus desarrolladores no son responsables por
        daños indirectos, pérdida de datos, lesiones o cualquier perjuicio derivado del uso de la app,
        incluyendo decisiones de salud, entrenamiento o alimentación tomadas a partir de su contenido.
        Usás la app bajo tu propio criterio y responsabilidad.
      </P>

      <H2>Cambios en el servicio</H2>
      <P>
        Podemos modificar, agregar o discontinuar funciones de la app en cualquier momento. Si hacemos
        cambios importantes a estos términos, te lo vamos a avisar dentro de la app antes de que
        entren en vigencia.
      </P>

      <H2>Ley aplicable</H2>
      <P>
        Estos términos se rigen por las leyes de la República Argentina, sin perjuicio de los derechos
        que te correspondan como consumidor según las leyes de tu país de residencia.
      </P>

      <H2>Contacto</H2>
      <P>
        Preguntas sobre estos términos:{' '}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. También podés
        leer nuestra{' '}
        <Link className="underline" href="/privacy">
          Política de Privacidad
        </Link>
        .
      </P>
    </div>
  );
}
