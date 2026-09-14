import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata: Metadata = { title: 'Política de Privacidad · GYMO' };

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

export default function PrivacyPage() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <Link
        href="/login"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight">Política de Privacidad de GYMO</h1>
      <p className="mt-1 text-xs text-muted-foreground">Última actualización: {LAST_UPDATED}</p>

      <P>
        Esta política explica qué datos recopila GYMO (&ldquo;la app&rdquo;, &ldquo;nosotros&rdquo;),
        para qué los usamos, con quién los compartimos y qué derechos tenés sobre ellos. Está escrita
        para ser leída y entendida por cualquier persona, sin necesidad de ser abogado.
      </P>
      <P>
        Responsable del tratamiento de datos: Juan Boazzo, operando GYMO como desarrollador
        independiente. Contacto: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </P>

      <H2>Qué datos recopilamos</H2>
      <P>Recopilamos únicamente lo que hace falta para que la app funcione:</P>
      <ul className="list-disc space-y-1 pl-5">
        <Li>
          <strong className="text-foreground">Cuenta:</strong> email y contraseña (la contraseña la
          gestiona Supabase Auth de forma cifrada; nunca la vemos en texto plano).
        </Li>
        <Li>
          <strong className="text-foreground">Perfil y objetivos:</strong> nombre, sexo, fecha de
          nacimiento, altura, peso, nivel de experiencia, objetivo, lugar y días de entrenamiento,
          preferencias alimenticias, alergias, lesiones o limitaciones físicas que nos cuentes.
        </Li>
        <Li>
          <strong className="text-foreground">Perfil de coaching (plan COACH):</strong> condiciones de
          salud, gustos y restricciones de comida, preferencias de entrenamiento, objetivo con tus
          propias palabras y tu día a día — todo opcional, lo cargás vos para individualizar tus
          planes.
        </Li>
        <Li>
          <strong className="text-foreground">Registros de uso:</strong> comidas, entrenamientos,
          peso, pasos, deportes y competencias, check-ins semanales y conversaciones con el AI Coach.
        </Li>
        <Li>
          <strong className="text-foreground">Fotos (excepción importante):</strong> si le mandás una
          foto de una comida o de tu físico a la IA para que la analice, esa foto se envía al modelo
          de IA para el análisis puntual y <strong className="text-foreground">se descarta
          inmediatamente</strong>: no la guardamos en ningún servidor ni base de datos nuestra. Sólo
          queda el texto del resultado (por ejemplo, las calorías estimadas).
        </Li>
        <Li>
          <strong className="text-foreground">Notificaciones push:</strong> si las activás, guardamos
          la suscripción de tu navegador/dispositivo para poder enviarte avisos.
        </Li>
        <Li>
          <strong className="text-foreground">Datos técnicos básicos:</strong> idioma preferido, tema
          claro/oscuro y sistema de unidades, guardados en una cookie o en tu dispositivo.
        </Li>
      </ul>
      <P>
        Hoy la app <strong className="text-foreground">no tiene cobros activos</strong> — cuando se
        habilite el pago de suscripciones, esta política se va a actualizar para explicar qué datos de
        pago procesa cada proveedor (Stripe, Google Play Billing o Apple, según corresponda); GYMO
        nunca va a ver ni guardar el número completo de tu tarjeta.
      </P>

      <H2>Para qué usamos tus datos</H2>
      <ul className="list-disc space-y-1 pl-5">
        <Li>Calcular tus objetivos nutricionales y armar tus rutinas y planes de comida.</Li>
        <Li>Que el AI Coach te responda con tus datos reales, no con respuestas genéricas.</Li>
        <Li>Mostrarte tu progreso (peso, entrenamientos, adherencia, récords, logros).</Li>
        <Li>Enviarte recordatorios que vos mismo activaste.</Li>
        <Li>Mantener tu cuenta segura y prevenir uso indebido de la app.</Li>
      </ul>
      <P>No usamos tus datos para publicidad dirigida ni los vendemos a terceros.</P>

      <H2>Con quién compartimos datos</H2>
      <P>No vendemos tus datos. Los compartimos únicamente con los proveedores que hacen posible la app:</P>
      <ul className="list-disc space-y-1 pl-5">
        <Li>
          <strong className="text-foreground">Supabase:</strong> aloja la base de datos y gestiona el
          login. Es quien guarda físicamente tu información.
        </Li>
        <Li>
          <strong className="text-foreground">Google (Gemini API):</strong> procesa los mensajes al AI
          Coach, la generación de planes y el análisis de fotos. Le mandamos sólo lo necesario para
          esa consulta puntual; las fotos nunca quedan guardadas del lado de GYMO.
        </Li>
        <Li>
          <strong className="text-foreground">Open Food Facts:</strong> buscador de alimentos por
          código de barras (base de datos pública, no le mandamos datos tuyos, sólo el código que
          escaneás).
        </Li>
      </ul>
      <P>
        Podríamos compartir información si la ley lo exige, o para proteger derechos, seguridad o
        propiedad de GYMO o de terceros.
      </P>

      <H2>Cookies y almacenamiento local</H2>
      <P>
        Usamos cookies técnicas necesarias para mantener tu sesión iniciada (Supabase Auth) y para
        recordar tu idioma. También usamos el almacenamiento del navegador (localStorage) para cosas
        como el entrenamiento que tenés en curso, así no se pierde si te quedás sin conexión. Hoy no
        usamos cookies de publicidad ni de seguimiento entre sitios.
      </P>

      <H2>Seguridad</H2>
      <P>
        Tus datos están protegidos por dos capas: a nivel de aplicación, cada consulta a la base de
        datos queda automáticamente limitada a tu propio usuario; y a nivel de base de datos, con
        Row Level Security de Postgres, que impide que un usuario pueda leer o modificar los datos de
        otro incluso si hubiera un error en el código de la app. Ninguna transmisión ni almacenamiento
        de datos es 100% infalible, pero tomamos medidas razonables para protegerlos.
      </P>

      <H2>Tus derechos</H2>
      <P>Desde Ajustes → Cuenta, en cualquier momento podés:</P>
      <ul className="list-disc space-y-1 pl-5">
        <Li>
          <strong className="text-foreground">Exportar</strong> una copia completa de todos tus datos
          en formato JSON.
        </Li>
        <Li>
          <strong className="text-foreground">Eliminar</strong> tu cuenta y todos tus datos de forma
          permanente e inmediata — no hace falta escribirnos para esto.
        </Li>
        <Li>
          <strong className="text-foreground">Corregir</strong> cualquier dato de tu perfil vos mismo,
          editándolo directamente en la app.
        </Li>
      </ul>
      <P>
        Si preferís que gestionemos nosotros alguno de estos pedidos, o tenés cualquier otra consulta
        sobre tus datos, escribinos a{' '}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </P>

      <H2>Cuánto tiempo guardamos tus datos</H2>
      <P>
        Mientras tu cuenta esté activa. Si la eliminás, todos tus datos se borran de forma permanente
        e inmediata (excepto lo que la ley nos obligue a conservar, por ejemplo por motivos
        impositivos si en algún momento hay pagos de por medio).
      </P>

      <H2>Menores de edad</H2>
      <P>
        GYMO no está pensada para menores de 13 años. Si sos menor de edad según las leyes de tu
        país, necesitás el permiso de tu padre, madre o tutor para usar la app. Dado que la app maneja
        datos de salud, si sos padre/madre/tutor y creés que un menor a tu cargo cargó datos sin tu
        consentimiento, escribinos y lo eliminamos.
      </P>

      <H2>Cambios a esta política</H2>
      <P>
        Si hacemos cambios importantes, te lo vamos a avisar dentro de la app o por email antes de que
        entren en vigencia. La fecha de arriba siempre indica la última actualización.
      </P>

      <H2>Contacto</H2>
      <P>
        Cualquier duda sobre esta política o tus datos:{' '}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. También podés
        leer nuestros{' '}
        <Link className="underline" href="/terms">
          Términos de Servicio
        </Link>
        .
      </P>
    </div>
  );
}
