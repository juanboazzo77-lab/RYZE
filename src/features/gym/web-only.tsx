'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Dumbbell } from 'lucide-react';

/**
 * El panel del gimnasio es solo para la web. En la app del celular (iPhone/Android) no se muestra: la app es
 * para los clientes (entrenamiento, dieta y progreso). Si el dueño entra desde la app, ve este aviso y puede
 * seguir como un cliente más.
 */
export function WebOnly({ needsOnboarding, children }: { needsOnboarding: boolean; children: React.ReactNode }) {
  const [native, setNative] = useState<boolean | null>(null);
  useEffect(() => setNative(Capacitor.isNativePlatform()), []);

  if (native === null) return null;
  if (!native) return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Dumbbell className="size-6" />
      </span>
      <h1 className="text-xl font-bold tracking-tight">El panel del gimnasio es solo web</h1>
      <p className="text-sm text-muted-foreground">
        Para ver tus clientes, las cuotas y tu gimnasio, entrá desde el navegador de tu compu o tu celular a <span className="font-medium text-foreground">forzaai.app/gym</span>. Esta app es para entrenar, comer y seguir tu progreso.
      </p>
      <a
        href={needsOnboarding ? '/onboarding' : '/api/mode?to=member'}
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        {needsOnboarding ? 'Completar mi perfil y usar la app' : 'Usar la app como cliente'}
      </a>
    </div>
  );
}
