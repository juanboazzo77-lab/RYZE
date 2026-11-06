import QRCode from 'qrcode';
import { isCbu } from './payment';
import { readableOn } from '@/features/gym/brand';
import type { PaymentInfo } from '@/server/gym-payment';

/** El cartel para imprimir: "Pagá tu cuota" con el QR del link de pago y el alias para transferir. */
export async function PaymentPoster({ info }: { info: PaymentInfo }) {
  const color = info.color ?? '#1d9a5f';
  // El QR se arma acá, con el link que ya se validó (solo https) al guardarlo.
  const qr = info.link ? await QRCode.toDataURL(info.link, { margin: 1, width: 520, errorCorrectionLevel: 'M' }) : null;

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
        <p className="text-2xl font-extrabold tracking-tight">Pagá tu cuota</p>
        {qr ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`Código QR para pagar la cuota de ${info.gymName}`} className="mx-auto size-60 print:size-80" />
            <p className="text-sm text-[#5b6472]">Escaneá el código con la cámara o con tu app de pagos.</p>
          </>
        ) : null}
        {info.alias ? (
          <div className="rounded-xl bg-[#f3f5f7] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[#5b6472]">{isCbu(info.alias) ? 'CBU / CVU' : 'O transferí al alias'}</p>
            <p className="break-all text-lg font-bold">{info.alias}</p>
          </div>
        ) : null}
        <p className="text-xs text-[#5b6472]">Después de pagar, avisá en recepción así te anotan el pago.</p>
      </div>
    </div>
  );
}
