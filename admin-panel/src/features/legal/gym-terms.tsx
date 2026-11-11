/**
 * Términos y condiciones para gimnasios. Se aceptan al pedir el alta (y los gimnasios que ya estaban los aceptan la
 * primera vez que entran). Si se cambia el texto, subir TERMS_VERSION para volver a pedir la aceptación.
 */
export const TERMS_VERSION = '2026-11-11';
export const TERMS_DATE = '7 de noviembre de 2026';
const CONTACT = 'gimnasios@forzaai.app';

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-lg font-semibold tracking-tight">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>;
}
function Li({ children }: { children: React.ReactNode }) {
  return <li className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</li>;
}
const B = ({ children }: { children: React.ReactNode }) => <strong className="text-foreground">{children}</strong>;

export function GymTerms() {
  return (
    <>
      <P>
        Estos términos regulan el uso del panel y de los servicios de FORZA AI por parte de un gimnasio (&ldquo;el Gimnasio&rdquo;).
        FORZA AI es operado por Juan Boazzo como desarrollador independiente (&ldquo;FORZA AI&rdquo;, &ldquo;nosotros&rdquo;). Al pedir el alta, o al
        entrar por primera vez al panel si ya estabas dado de alta, el Gimnasio declara haberlos leído y aceptarlos.
        Quien los acepta declara tener facultades para obligar al Gimnasio.
      </P>

      <H2>1. Qué ofrecemos</H2>
      <ul className="list-disc space-y-1 pl-5">
        <Li>
          <B>Un panel web</B> para llevar la lista de clientes y el control de sus cuotas, ver cobros, generar un cartel con QR de cobro,
          armar rutinas y clases con reserva, crear retos entre socios, cargar sus máquinas y su marca.
        </Li>
        <Li>
          <B>Un QR y una página web propia del Gimnasio</B> donde cada cliente crea su cuenta, paga su plan mensual de FORZA AI por su cuenta (con
          Mercado Pago) y queda conectado al Gimnasio. El Gimnasio no paga por esos clientes.
        </Li>
        <Li>
          <B>FORZA AI para los clientes que se suman:</B> un plan de entrenamiento y uno de dieta por mes, armados con las máquinas y la
          especialidad del Gimnasio, una cantidad diaria de mensajes con un coach de inteligencia artificial y una revisión con ajustes cada dos
          semanas. Esas cantidades pueden cambiar con aviso previo.
        </Li>
      </ul>

      <H2>2. Alta del Gimnasio</H2>
      <P>
        Pedir el alta no garantiza que sea aprobada: FORZA AI aprueba cada gimnasio a su criterio. El Gimnasio se
        compromete a dar datos verdaderos y a mantenerlos al día. Podemos rechazar, suspender o dar de baja un gimnasio que incumpla estos términos.
      </P>

      <H2>3. Clientes que se suman y pago</H2>
      <ul className="list-disc space-y-1 pl-5">
        <Li>
          <B>Clientes que se suman por el QR del Gimnasio:</B> crean su cuenta y pagan su plan mensual directamente a FORZA AI. Ese pago es del
          cliente, no del Gimnasio: no genera ningún cobro al Gimnasio y no ocupa cupo. El cliente puede cancelar su plan cuando quiera desde
          Mercado Pago; al cancelarlo deja de estar conectado al Gimnasio. FORZA AI es quien presta el servicio y quien cobra ese plan, y no es
          parte de la relación de cuota entre el Gimnasio y sus clientes.
        </Li>
        <Li>
          <B>Meta de clientes con el plan:</B> el Gimnasio se compromete a ofrecer el plan a sus clientes. FORZA AI espera que el Gimnasio llegue a
          10 clientes con el plan activo; mientras tanto el Gimnasio puede usar el panel, incluso para llevar clientes que no usan la aplicación.
        </Li>
        <Li>FORZA AI no cobra al Gimnasio por el uso del panel ni por los clientes que se suman por su QR. No hay reembolso de los meses ya iniciados de un plan, salvo que la ley disponga otra cosa.</Li>
      </ul>

      <H2>4. Datos de los clientes del Gimnasio</H2>
      <P>
        El Gimnasio es el <B>responsable</B> de los datos de sus clientes (nombre, mail, teléfono, cuota, vencimientos y pagos que carga en el
        panel). FORZA AI los guarda y trata <B>por cuenta y orden del Gimnasio</B>, únicamente para darle el panel y para enviarle los avisos
        que el Gimnasio pide; no los usa para otro fin, no los vende ni los cede.
      </P>
      <P>El Gimnasio declara y garantiza que:</P>
      <ul className="list-disc space-y-1 pl-5">
        <Li>tiene derecho a cargar esos datos y cuenta con el consentimiento de sus clientes cuando la ley lo exige (Ley 25.326 de Protección de Datos Personales y normas complementarias);</Li>
        <Li>sus clientes saben que su mail se usará para identificarlos y para avisarles de su cuota;</Li>
        <Li>cumple las obligaciones que le correspondan como responsable de datos, incluida la inscripción de su base de datos si corresponde.</Li>
      </ul>
      <P>
        Cuando el Gimnasio termine su relación con nosotros, borramos o le devolvemos los datos de sus clientes que cargó en el panel, a su pedido y
        dentro de los 30 días.
      </P>

      <H2>5. Qué ve el Gimnasio de sus socios con FORZA AI</H2>
      <P>
        El socio que usa FORZA AI es titular de su propia cuenta y de sus datos. El Gimnasio ve solamente:
      </P>
      <ul className="list-disc space-y-1 pl-5">
        <Li>totales: cuántos socios hay, cuántos entrenaron en la semana y cuántos llevan 10 días o más sin entrenar;</Li>
        <Li>el nombre y la última actividad de los socios que lo permitieron expresamente;</Li>
        <Li>el ranking de los retos, solo de los socios que se sumaron, con su nombre y la inicial del apellido;</Li>
        <Li>los nombres de quienes reservaron cada clase del Gimnasio.</Li>
      </ul>
      <P>
        El Gimnasio <B>no accede</B> al peso, las fotos, las comidas, los datos de salud, los planes ni las conversaciones con el coach de IA de sus
        socios, y se compromete a no intentar obtenerlos. Se compromete también a usar lo que ve solo para atender a sus propios socios (por
        ejemplo, contactarlos si dejaron de entrenar), a no publicarlo, no cederlo, no usarlo para discriminar y a respetar si un socio le pide
        no ser contactado.
      </P>

      <H2>6. Contenido y marca del Gimnasio</H2>
      <ul className="list-disc space-y-1 pl-5">
        <Li>
          Las rutinas, clases, horarios, retos, premios, logo y demás contenido que carga el Gimnasio son <B>de su responsabilidad</B>. Declara
          tener derecho a usar el logo y el contenido que sube, y no cargar nada ilegal, engañoso u ofensivo. Podemos retirar lo que lo sea.
        </Li>
        <Li>El Gimnasio nos da una licencia limitada y gratuita para mostrar su nombre, logo y contenido a sus socios dentro de FORZA AI, mientras sea cliente.</Li>
        <Li>
          Los premios de los retos los define y los entrega el Gimnasio, bajo su exclusiva responsabilidad y cumpliendo las normas que apliquen a
          promociones, concursos o sorteos.
        </Li>
        <Li>El Gimnasio puede decir que usa FORZA AI. Cualquier otro uso de nuestra marca necesita nuestro permiso.</Li>
      </ul>

      <H2>7. Salud y responsabilidad del Gimnasio</H2>
      <P>
        FORZA AI <B>no es un profesional de la salud</B>. Los planes y mensajes que genera la inteligencia artificial son estimaciones y pueden
        tener errores; no reemplazan a un médico, nutricionista ni profesor. El Gimnasio sigue siendo el único responsable de la supervisión de sus
        clientes en el local, de sus instalaciones, de sus profesores, de las clases que dicta, de los aptos médicos y seguros que corresponda
        exigir, y de cualquier lesión o daño ocurrido en su actividad.
      </P>

      <H2>8. Cobro de las cuotas a sus clientes</H2>
      <P>
        El panel solo lleva la cuenta de lo que el Gimnasio anota. <B>FORZA AI no procesa ni intermedia pagos entre el Gimnasio y sus clientes.</B>{' '}
        El link de pago y el QR que el Gimnasio configura son suyos (por ejemplo, de Mercado Pago) y FORZA AI no es parte ni responsable de esas
        operaciones.
      </P>

      <H2>9. Cuentas y seguridad</H2>
      <P>
        El acceso al panel es personal. El Gimnasio es responsable de quién entra con su cuenta y de mantener segura su contraseña, y debe avisarnos
        de inmediato si sospecha un uso no autorizado.
      </P>

      <H2>10. Disponibilidad y cambios</H2>
      <P>
        Hacemos lo posible para que el servicio funcione bien, pero se ofrece &ldquo;tal cual&rdquo;: puede tener interrupciones, errores o cambios.
        Podemos modificar o discontinuar funciones; si el cambio es importante, avisaremos con tiempo razonable.
      </P>

      <H2>11. Límite de responsabilidad</H2>
      <P>
        En la máxima medida que permita la ley, FORZA AI no responde por daños indirectos, lucro cesante o pérdida de datos, ni por lo que ocurra
        en el local del Gimnasio. Si fuera responsable, su responsabilidad total se limita a lo que el Gimnasio haya pagado a FORZA AI en los 3 meses
        anteriores al hecho. Esto no alcanza los casos de dolo.
      </P>

      <H2>12. Duración y baja</H2>
      <P>
        Estos términos rigen mientras el Gimnasio use el servicio. Cualquiera de las partes puede terminar la relación avisando por mail con 30 días
        de anticipación. FORZA AI puede suspenderla de inmediato ante un incumplimiento grave. Al terminar, los clientes del Gimnasio dejan de estar
        conectados a él (los clientes con plan siguen con su plan de FORZA AI).
      </P>

      <H2>13. Cambios en estos términos</H2>
      <P>
        Si cambiamos estos términos, se lo avisaremos al Gimnasio por mail con al menos 15 días de anticipación, y el panel le va a pedir que acepte la
        nueva versión. Si no está de acuerdo, puede darse de baja.
      </P>

      <H2>14. Ley aplicable y jurisdicción</H2>
      <P>
        Estos términos se rigen por las leyes de la República Argentina. Para cualquier controversia, las partes se someten a los tribunales
        ordinarios de la Ciudad Autónoma de Buenos Aires, salvo que la ley establezca otra jurisdicción.
      </P>

      <H2>15. Contacto</H2>
      <P>
        Consultas sobre estos términos o sobre los datos del Gimnasio:{' '}
        <a className="underline" href={`mailto:${CONTACT}`}>
          {CONTACT}
        </a>
        .
      </P>
    </>
  );
}
