'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Capacitor } from '@capacitor/core';

type Platform = 'web' | 'ios' | 'android';

/**
 * Nota de cobro de la pantalla de planes. En la web explica cómo se procesa el pago. En las apps
 * de iPhone/Android NO se nombran otros medios de pago (la tienda lo prohíbe) y se muestran los
 * datos que exigen Apple y Google: cobro a la cuenta de la tienda, renovación automática,
 * cómo cancelar y los enlaces a los términos y a la privacidad.
 */
export function BillingNote({
  webNote,
  iosNote,
  androidNote,
  termsLabel,
  privacyLabel,
  previewPlatform,
}: {
  webNote: string;
  iosNote: string;
  androidNote: string;
  termsLabel: string;
  privacyLabel: string;
  /** Sólo para capturas de pantalla: fuerza cómo se vería en una plataforma. */
  previewPlatform?: Platform;
}) {
  const [platform, setPlatform] = useState<Platform>(previewPlatform ?? 'web');

  useEffect(() => {
    if (previewPlatform) return;
    if (Capacitor.isNativePlatform()) setPlatform(Capacitor.getPlatform() === 'ios' ? 'ios' : 'android');
  }, [previewPlatform]);

  if (platform === 'web') {
    return <p className="text-center text-xs text-muted-foreground">{webNote}</p>;
  }
  return (
    <div className="space-y-1.5 text-center text-xs text-muted-foreground">
      <p>{platform === 'ios' ? iosNote : androidNote}</p>
      <p>
        <Link href="/terms" className="underline">
          {termsLabel}
        </Link>
        {' · '}
        <Link href="/privacy" className="underline">
          {privacyLabel}
        </Link>
      </p>
    </div>
  );
}
