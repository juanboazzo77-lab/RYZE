'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraOff, Loader2 } from 'lucide-react';
import { useT } from '@/i18n/provider';

type ScanError = 'denied' | 'nocam' | 'other';

/**
 * Lector de códigos de barras por cámara (ZXing). `@zxing/*` se carga de forma
 * perezosa para no pesar en el bundle inicial. Llama a `onDetected` una sola
 * vez con el código normalizado (sólo dígitos).
 */
export function BarcodeScanner({
  active,
  onDetected,
}: {
  active: boolean;
  onDetected: (code: string) => void;
}) {
  const t = useT();
  const td = t.nutrition.dialog;
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
  const [error, setError] = useState<ScanError | null>(null);

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let controls: { stop: () => void } | undefined;
    let done = false;

    setStatus('starting');
    setError(null);

    (async () => {
      try {
        const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);

        const hints = new Map<number, unknown>();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.ITF,
          BarcodeFormat.CODE_128,
        ]);

        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 150,
          delayBetweenScanSuccess: 400,
        });

        if (stopped || !videoRef.current) return;

        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current,
          (result) => {
            if (done || !result) return;
            const code = result.getText().replace(/\D/g, '');
            if (code.length < 8 || code.length > 14) return;
            done = true;
            controls?.stop();
            onDetectedRef.current(code);
          },
        );

        if (stopped) {
          controls.stop();
          return;
        }
        setStatus('scanning');
      } catch (e) {
        const name = e instanceof Error ? e.name : '';
        setError(
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'denied'
            : name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError'
              ? 'nocam'
              : 'other',
        );
        setStatus('error');
      }
    })();

    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [active]);

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
        <CameraOff className="size-6 text-muted-foreground" />
        <p className="px-6 text-sm text-muted-foreground">
          {error === 'denied'
            ? td.scanPermissionDenied
            : error === 'nocam'
              ? td.scanNoCamera
              : td.scanError}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 py-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="size-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-24 w-4/5 rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        {status === 'starting' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        ) : null}
      </div>
      <p className="text-center text-xs text-muted-foreground">{td.scanHint}</p>
    </div>
  );
}
