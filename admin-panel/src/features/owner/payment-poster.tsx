import QRCode from 'qrcode';
import { isCbu } from './payment';
import { readableOn } from '@/features/gym/brand';
import { formatMoney } from '@/features/gym/money';
import { gymLandingUrl, type PaymentInfo } from '@/server/gym-payment';

export type PosterKind = 'FEE' | 'PLAN' | 'WEB';

/** Los pasos que se imprimen en el cartel de la página web del gimnasio, para que el cliente sepa qué hacer. */
const WEB_STEPS = [
  { title: 'Escaneá el código', text: 'Abrí la cámara de tu celular y apuntá al QR.' },
  { title: 'Creá tu cuenta', text: 'Con tu mail y una contraseña. Es gratis.' },
  { title: 'Activá tu plan', text: 'Pagás el plan mensual con Mercado Pago. Podés cancelarlo cuando quieras.' },
  { title: 'Entrená', text: 'Entrá con tu cuenta en forzaai.app o en la app de Forza AI y ya tenés tu rutina, tu dieta y tu coach.' },
] as const;

/**
 * El cartel para imprimir. FEE = "Pagá tu cuota" (con el alias para transferir); PLAN = el plan de rutina con IA,
 * que el cliente puede pagar aparte, con su propio QR y valor; WEB = la página web del gimnasio, donde el cliente crea su
 * cuenta y activa su plan.
 */
export async function PaymentPoster({ info, kind }: { info: PaymentInfo; kind: PosterKind }) {
  const color = info.color ?? '#1d9a5f';
  const webUrl = gymLandingUrl(info.inviteCode);
  const link = kind === 'WEB' ? webUrl : kind === 'PLAN' ? info.planLink : info.link;
  // El QR se arma acá, con el link que ya se validó (solo https) al guardarlo.
  const qr = link ? await QRCode.toDataURL(link, { margin: 1, width: 520, errorCorrectionLevel: 'M' }) : null;

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border bg-white text-center text-[#161a22] shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
      <div className="px-6 py-5" style={{ background: color, color: readableOn(color) }}>
        <div className="flex items-center justify-center gap-3">
          {info.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={info.logoUrl} alt="" className="size-12 rounded-xl bg-white object-contain p-1" />
          ) : null}
          <p className="text-xl font-bold">{info.gymName}</p>
        </div>
      </div>
      <div className="space-y-4 px-6 py-6">
        {kind === 'WEB' ? (
          <>
            <p className="text-2xl font-extrabold tracking-tight">Entrená con {info.gymName}</p>
            <p className="text-sm text-[#5b6472]">Activá tu plan de entrenamiento y dieta con inteligencia artificial, hecho para las máquinas de tu gimnasio.</p>
          </>
        ) : kind === 'PLAN' ? (
          <>
            <p className="text-2xl font-extrabold tracking-tight">Tu plan de rutina con IA</p>
            <p className="text-sm text-[#5b6472]">Tu plan de entrenamiento y tu plan de dieta del mes, armados con las máquinas de {info.gymName}, más mensajes con tu coach de IA.</p>
            {info.planAmount !== null ? <p className="text-lg font-bold">{formatMoney(info.planAmount, info.currency)} por mes</p> : null}
          </>
        ) : (
          <p className="text-2xl font-extrabold tracking-tight">Pagá tu cuota</p>
        )}
        {qr ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={kind === 'WEB' ? `Código QR de la página de ${info.gymName}` : `Código QR para pagar ${kind === 'PLAN' ? 'el plan de rutina' : 'la cuota'} de ${info.gymName}`} className="mx-auto size-60 print:size-72" />
            <p className="text-sm text-[#5b6472]">{kind === 'WEB' ? 'Escaneá el código con la cámara de tu celular.' : 'Escaneá el código con la cámara o con tu app de pagos.'}</p>
          </>
        ) : null}
        {kind === 'WEB' ? (
          <ol className="space-y-2 text-left">
            {WEB_STEPS.map((st, i) => (
              <li key={st.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: color, color: readableOn(color) }}>
                  {i + 1}
                </span>
                <span className="text-sm">
                  <strong>{st.title}.</strong> <span className="text-[#5b6472]">{st.text}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : null}
        {kind === 'FEE' && info.alias ? (
          <div className="rounded-xl bg-[#f3f5f7] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[#5b6472]">{isCbu(info.alias) ? 'CBU / CVU' : 'O transferí al alias'}</p>
            <p className="break-all text-lg font-bold">{info.alias}</p>
          </div>
        ) : null}
        <p className="text-xs text-[#5b6472]">
          {kind === 'WEB' ? `Tu plan es tuyo: lo pagás vos y ${info.gymName} te suma a sus rutinas, clases y retos.` : kind === 'PLAN' ? 'Después de pagar, avisá en recepción y pasá tu mail para activar tu plan.' : 'Después de pagar, avisá en recepción así te anotan el pago.'}
        </p>
      </div>
    </div>
  );
}
