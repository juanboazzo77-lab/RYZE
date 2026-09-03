'use client';

import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Sin i18n a propósito: este límite de error puede renderizarse por encima
  // de los providers si algo falla muy arriba en el árbol.
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-lg font-semibold">Algo salió mal / Something went wrong</p>
      <Button onClick={reset} variant="outline">
        <RotateCcw className="size-4" />
        Reintentar / Retry
      </Button>
    </div>
  );
}
