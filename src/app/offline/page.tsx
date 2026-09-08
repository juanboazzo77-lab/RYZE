import type { Metadata } from 'next';
import { WifiOff } from 'lucide-react';

export const metadata: Metadata = { title: 'Sin conexión' };

export default function OfflinePage() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <WifiOff className="size-8 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Sin conexión</h1>
        <p className="text-sm text-muted-foreground">
          No hay internet ahora mismo. Lo que registres en un entrenamiento activo queda guardado en
          el dispositivo y se sincroniza cuando vuelva la señal.
        </p>
        <p className="text-sm text-muted-foreground">
          No internet right now. Anything you log in an active workout is saved on the device and
          syncs when you&rsquo;re back online.
        </p>
      </div>
    </div>
  );
}
