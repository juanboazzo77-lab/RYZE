'use client';

import Link from 'next/link';
import { Megaphone } from 'lucide-react';

/**
 * Espacio de publicidad para el plan FREE. Placeholder honesto (rotulado,
 * sin disfrazarse de contenido) hasta conectar un proveedor real (AdMob para
 * las apps nativas de Play Store/App Store, AdSense para la web). Cuando haya
 * cuenta, este componente pasa a cargar el SDK real; el resto de la app
 * (gating por `showAds`, el "sin anuncios" de /settings/plans) no cambia.
 */
export function AdSlot({ label, removeAdsLabel }: { label: string; removeAdsLabel: string }) {
  return (
    <div className="mb-3 space-y-1">
      <div className="flex min-h-[64px] items-center justify-center gap-2 rounded-lg border border-dashed bg-secondary/40 px-4 py-3 text-center">
        <Megaphone className="size-4 shrink-0 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <Link
        href="/settings/plans"
        className="block text-center text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {removeAdsLabel}
      </Link>
    </div>
  );
}
